import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  photo_url?: string;
}

interface TelegramInitData {
  user?: TelegramUser;
  auth_date: number;
  hash: string;
  query_id?: string;
}

function parseInitData(initDataString: string): TelegramInitData | null {
  try {
    const params = new URLSearchParams(initDataString);
    const hash = params.get("hash");
    const authDate = params.get("auth_date");
    const userStr = params.get("user");

    if (!hash || !authDate) return null;

    const user = userStr ? JSON.parse(decodeURIComponent(userStr)) : null;

    return {
      user,
      auth_date: parseInt(authDate),
      hash,
      query_id: params.get("query_id") || undefined,
    };
  } catch {
    return null;
  }
}

function arrayBufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function validateInitData(initDataString: string, botToken: string): Promise<boolean> {
  try {
    const params = new URLSearchParams(initDataString);
    const hash = params.get("hash");
    if (!hash) return false;

    params.delete("hash");

    const sortedParams = Array.from(params.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join("\n");

    const encoder = new TextEncoder();

    // Create secret key: HMAC-SHA256("WebAppData", botToken)
    const webAppDataKey = await crypto.subtle.importKey(
      "raw",
      encoder.encode("WebAppData"),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const secretKeyBuffer = await crypto.subtle.sign("HMAC", webAppDataKey, encoder.encode(botToken));

    // Calculate hash: HMAC-SHA256(secretKey, dataCheckString)
    const secretKey = await crypto.subtle.importKey(
      "raw",
      secretKeyBuffer,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const hashBuffer = await crypto.subtle.sign("HMAC", secretKey, encoder.encode(sortedParams));
    const calculatedHash = arrayBufferToHex(hashBuffer);

    return calculatedHash === hash;
  } catch (error) {
    console.error("Validation error:", error);
    return false;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { initData } = await req.json();

    if (!initData) {
      return new Response(
        JSON.stringify({ error: "Missing initData" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
    if (!botToken) {
      console.error("TELEGRAM_BOT_TOKEN not configured");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const isValid = await validateInitData(initData, botToken);
    if (!isValid) {
      console.log("Invalid initData signature");
      return new Response(
        JSON.stringify({ error: "Invalid authentication" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const parsedData = parseInitData(initData);
    if (!parsedData?.user) {
      return new Response(
        JSON.stringify({ error: "Invalid user data" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const now = Math.floor(Date.now() / 1000);
    if (now - parsedData.auth_date > 3600) {
      return new Response(
        JSON.stringify({ error: "Authentication expired" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const telegramUser = parsedData.user;

    // Upsert profile (no photo fetch on auth - too slow)
    const { data: profile, error: upsertError } = await supabase
      .from("profiles")
      .upsert(
        {
          telegram_id: telegramUser.id,
          username: telegramUser.username,
          first_name: telegramUser.first_name,
          last_name: telegramUser.last_name,
          language_code: telegramUser.language_code || "ru",
        },
        { onConflict: "telegram_id" }
      )
      .select()
      .single();

    if (upsertError) {
      console.error("Upsert error:", upsertError);
      return new Response(
        JSON.stringify({ error: "Failed to sync profile" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Batch: ensure role + fetch roles in parallel
    const [, { data: roles }] = await Promise.all([
      // Ensure user role exists (upsert-like)
      supabase.from("user_roles").upsert(
        { user_id: profile.id, role: "user" },
        { onConflict: "user_id" }
      ),
      // Fetch all roles
      supabase.from("user_roles").select("role").eq("user_id", profile.id),
    ]);

    // Fire-and-forget analytics (don't await)
    supabase.from("analytics_events").insert({
      user_id: profile.id,
      event_type: "auth",
      event_data: { telegram_id: telegramUser.id },
    }).then(() => {});

    // Fire-and-forget photo update in background
    if (!profile.photo_url) {
      fetchAndUpdatePhoto(botToken, telegramUser.id, profile.id, supabase).catch(() => {});
    }

    console.log(`User authenticated: ${telegramUser.id} (${telegramUser.username})`);

    return new Response(
      JSON.stringify({
        success: true,
        user: {
          ...profile,
          roles: roles?.map((r) => r.role) || ["user"],
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Auth error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function fetchAndUpdatePhoto(botToken: string, telegramId: number, profileId: string, supabase: any) {
  try {
    const photosRes = await fetch(
      `https://api.telegram.org/bot${botToken}/getUserProfilePhotos?user_id=${telegramId}&limit=1`
    );
    const photosData = await photosRes.json();
    if (!photosData.ok || !photosData.result?.photos?.length) return;

    const fileId = photosData.result.photos[0][0].file_id;
    const fileRes = await fetch(`https://api.telegram.org/bot${botToken}/getFile?file_id=${fileId}`);
    const fileData = await fileRes.json();
    if (!fileData.ok || !fileData.result?.file_path) return;

    const photoUrl = `https://api.telegram.org/file/bot${botToken}/${fileData.result.file_path}`;
    await supabase.from("profiles").update({ photo_url: photoUrl }).eq("id", profileId);
  } catch {
    // Not critical
  }
}
