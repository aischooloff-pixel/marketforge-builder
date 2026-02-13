import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
    if (!botToken) {
      return new Response(
        JSON.stringify({ error: "Bot token not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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
    cleaned = cleaned.split("/")[0]; // remove trailing paths
    cleaned = cleaned.split("?")[0]; // remove query params

    if (!cleaned || cleaned.length < 3 || cleaned.length > 64) {
      return new Response(
        JSON.stringify({ error: "Invalid username" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Try getChat to resolve the user
    const chatRes = await fetch(`https://api.telegram.org/bot${botToken}/getChat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: `@${cleaned}` }),
    });

    const chatData = await chatRes.json();

    if (!chatData.ok) {
      return new Response(
        JSON.stringify({ error: "Пользователь не найден", details: chatData.description }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const chat = chatData.result;
    
    // Get profile photo
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
      } catch (e) {
        console.error("Failed to get profile photo:", e);
      }
    }

    return new Response(
      JSON.stringify({
        id: chat.id,
        username: chat.username || cleaned,
        first_name: chat.first_name || chat.title || cleaned,
        last_name: chat.last_name || null,
        photo_url: photoUrl,
        type: chat.type, // "private", "group", etc.
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
