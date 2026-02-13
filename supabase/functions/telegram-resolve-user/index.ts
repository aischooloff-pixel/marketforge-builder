import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    // Normalize: strip https://t.me/, @, etc.
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

    // 1) First try: search in our DB (all mini app users are registered)
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

    // 2) Second try: Telegram Bot API getChat
    const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
    if (botToken) {
      try {
        const chatRes = await fetch(`https://api.telegram.org/bot${botToken}/getChat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: `@${cleaned}` }),
        });
        const chatData = await chatRes.json();

        if (chatData.ok) {
          const chat = chatData.result;
          let photoUrl: string | null = null;
          if (chat.photo?.big_file_id) {
            try {
              const fileRes = await fetch(`https://api.telegram.org/bot${botToken}/getFile`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ file_id: chat.photo.big_file_id }),
              });
              const fileData = await fileRes.json();
              if (fileData.ok && fileData.result?.file_path) {
                photoUrl = `https://api.telegram.org/file/bot${botToken}/${fileData.result.file_path}`;
              }
            } catch {}
          }

          return new Response(
            JSON.stringify({
              id: chat.id,
              username: chat.username || cleaned,
              first_name: chat.first_name || chat.title || cleaned,
              last_name: chat.last_name || null,
              photo_url: photoUrl,
              type: chat.type,
              source: "telegram",
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      } catch (e) {
        console.error("Telegram API error:", e);
      }
    }

    // 3) Fallback: accept username without verification
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
