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

    // Try to get user's profile photo from Telegram Bot API
    let photoUrl = telegramUser.photo_url;
    if (!photoUrl) {
      try {
        const photosResponse = await fetch(
          `https://api.telegram.org/bot${botToken}/getUserProfilePhotos?user_id=${telegramUser.id}&limit=1`
        );
        const photosData = await photosResponse.json();
        
        if (photosData.ok && photosData.result?.photos?.length > 0) {
          // Get the smallest photo (first in array)
          const photo = photosData.result.photos[0];
          const smallestPhoto = photo[0]; // smallest size
          
          // Get file path
          const fileResponse = await fetch(
            `https://api.telegram.org/bot${botToken}/getFile?file_id=${smallestPhoto.file_id}`
          );
          const fileData = await fileResponse.json();
          
          if (fileData.ok && fileData.result?.file_path) {
            photoUrl = `https://api.telegram.org/file/bot${botToken}/${fileData.result.file_path}`;
          }
        }
      } catch (photoError) {
        console.log("Could not fetch profile photo:", photoError);
        // Continue without photo - not critical
      }
    }

    const { data: profile, error: upsertError } = await supabase
      .from("profiles")
      .upsert(
        {
          telegram_id: telegramUser.id,
          username: telegramUser.username,
          first_name: telegramUser.first_name,
          last_name: telegramUser.last_name,
          photo_url: photoUrl || null,
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

    const { data: existingRole } = await supabase
      .from("user_roles")
      .select("*")
      .eq("user_id", profile.id)
      .single();

    if (!existingRole) {
      await supabase.from("user_roles").insert({ user_id: profile.id, role: "user" });
    }

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", profile.id);

    await supabase.from("analytics_events").insert({
      user_id: profile.id,
      event_type: "auth",
      event_data: { telegram_id: telegramUser.id },
    });

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
