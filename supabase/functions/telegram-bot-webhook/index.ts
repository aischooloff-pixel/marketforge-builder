import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const WELCOME_MESSAGE = `👋 Привет! Добро пожаловать в <b>Temka Store</b>!

🛒 Мы — удобный магазин цифровых товаров прямо в Telegram. Быстро, просто и безопасно — находи нужный товар и покупай в пару кликов.

📢 Подписывайся на наш канал, чтобы не пропустить новинки и акции:
👉 @TemkaStoreNews

Жми кнопку ниже, чтобы открыть магазин 👇`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
  if (!botToken) {
    console.error("[TelegramBot] TELEGRAM_BOT_TOKEN not set");
    return new Response(JSON.stringify({ error: "Bot token not configured" }), { status: 500, headers: corsHeaders });
  }

  // GET request = auto-setup webhook
  if (req.method === "GET") {
    const webhookUrl = `https://uoolrqypmyubdiiaqnfv.supabase.co/functions/v1/telegram-bot-webhook`;
    const res = await fetch(`https://api.telegram.org/bot${botToken}/setWebhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: webhookUrl }),
    });
    const result = await res.json();
    console.log("[TelegramBot] Webhook setup result:", JSON.stringify(result));
    return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  try {
    const update = await req.json();
    console.log("[TelegramBot] Received update:", JSON.stringify(update));

    const message = update.message;
    if (!message) {
      // Not a message update (could be callback_query, etc.)
      return new Response("ok", { status: 200 });
    }

    const chatId = message.chat.id;
    const text = message.text?.trim();

    // Handle /start command
    if (text === "/start" || text?.startsWith("/start ")) {
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: WELCOME_MESSAGE,
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: "🛍 Открыть магазин",
                  url: "https://t.me/Temka_Store_Bot/app",
                },
              ],
              [
                {
                  text: "📢 Наш канал",
                  url: "https://t.me/TemkaStoreNews",
                },
              ],
            ],
          },
        }),
      });

      console.log(`[TelegramBot] Sent welcome message to chat ${chatId}`);
    }

    return new Response("ok", { status: 200 });
  } catch (error) {
    console.error("[TelegramBot] Error:", error);
    // Always return 200 to Telegram to prevent retry loops
    return new Response("ok", { status: 200 });
  }
});
