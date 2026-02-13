import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function extractMeta(html: string, property: string): string | null {
  // Match both property="..." and name="..." attributes
  const regex = new RegExp(
    `<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']+)["']|<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${property}["']`,
    "i"
  );
  const match = html.match(regex);
  return match ? (match[1] || match[2] || null) : null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { username } = await req.json();
    if (!username || typeof username !== "string") {
      return new Response(
        JSON.stringify({ error: "Missing username" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Normalize
    let cleaned = username.trim();
    cleaned = cleaned.replace(/^https?:\/\/(t\.me|telegram\.me)\//i, "");
    cleaned = cleaned.replace(/^@/, "");
    cleaned = cleaned.split("/")[0];
    cleaned = cleaned.split("?")[0];

    if (!cleaned || cleaned.length < 3 || cleaned.length > 64) {
      return new Response(
        JSON.stringify({ error: "Некорректный username" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1) Check our DB first
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { data: profile } = await supabase
      .from("profiles")
      .select("telegram_id, username, first_name, last_name, photo_url")
      .ilike("username", cleaned)
      .single();

    if (profile) {
      return new Response(
        JSON.stringify({
          id: profile.telegram_id,
          username: profile.username || cleaned,
          first_name: profile.first_name || cleaned,
          last_name: profile.last_name || null,
          photo_url: profile.photo_url || null,
          type: "private",
          source: "db",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2) Parse t.me/username page for og:title and og:image
    try {
      const tmeRes = await fetch(`https://t.me/${cleaned}`, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; TelegramBot/1.0)",
        },
      });

      if (tmeRes.ok) {
        const html = await tmeRes.text();
        const ogTitle = extractMeta(html, "og:title");
        const ogImage = extractMeta(html, "og:image");
        const ogDesc = extractMeta(html, "og:description");

        // Check if it's a valid user/channel page (not "Telegram" default)
        if (ogTitle && ogTitle !== "Telegram" && ogTitle !== "Telegram: Contact @" + cleaned) {
          return new Response(
            JSON.stringify({
              id: null,
              username: cleaned,
              first_name: ogTitle,
              last_name: null,
              photo_url: ogImage || null,
              type: ogDesc?.includes("channel") ? "channel" : ogDesc?.includes("group") ? "group" : "private",
              source: "t.me",
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
    } catch (e) {
      console.error("t.me parse error:", e);
    }

    // 3) Fallback: accept without verification
    return new Response(
      JSON.stringify({
        id: null,
        username: cleaned,
        first_name: cleaned,
        last_name: null,
        photo_url: null,
        type: "unverified",
        source: "input",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Resolve user error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
