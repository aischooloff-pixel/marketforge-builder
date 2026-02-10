import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const WELCOME_MESSAGE = `👋 Добро пожаловать в <b>Temka Store</b>!

🛒 Удобный магазин цифровых товаров в Telegram.

📢 Подписывайся на канал:
👉 @TemkaStoreNews

Жми кнопку ниже, чтобы открыть магазин 👇`;

// Captcha items: [emoji, label]
const CAPTCHA_ITEMS: [string, string][] = [
  ["🍎", "Яблоко"],
  ["🚗", "Машину"],
  ["🎒", "Рюкзак"],
  ["⭐", "Звезду"],
  ["🎸", "Гитару"],
  ["🌻", "Подсолнух"],
  ["🍕", "Пиццу"],
  ["🏀", "Мяч"],
  ["🎧", "Наушники"],
  ["🐱", "Кота"],
  ["🌈", "Радугу"],
  ["🔑", "Ключ"],
  ["🎂", "Торт"],
  ["☂️", "Зонт"],
  ["💎", "Алмаз"],
  ["🦋", "Бабочку"],
  ["🍉", "Арбуз"],
  ["🎯", "Мишень"],
];

function buildCaptcha() {
  // Pick 3 unique random items
  const shuffled = [...CAPTCHA_ITEMS].sort(() => Math.random() - 0.5);
  const options = shuffled.slice(0, 3);
  // Pick one as the correct answer
  const correctIdx = Math.floor(Math.random() * 3);
  const correct = options[correctIdx];

  const text = `🤖 Привет! Чтобы убедиться, что вы не робот — пройдите проверку.\n\nНажми на ${correct[0]} ${correct[1]}`;

  const buttons = options.map(([emoji, label], i) => ({
    text: emoji,
    callback_data: i === correctIdx ? "captcha_ok" : "captcha_fail",
  }));

  return { text, buttons };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
  if (!botToken) {
    return new Response(JSON.stringify({ error: "Bot token not configured" }), { status: 500, headers: corsHeaders });
  }

  // GET = setup webhook
  if (req.method === "GET") {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const webhookUrl = `${supabaseUrl}/functions/v1/telegram-bot-webhook`;
    const res = await fetch(`https://api.telegram.org/bot${botToken}/setWebhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: webhookUrl }),
    });
    const result = await res.json();
    return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

  try {
    const update = await req.json();

    // --- Handle callback_query (captcha answer) ---
    const callback = update.callback_query;
    if (callback) {
      const chatId = callback.message?.chat?.id;
      const messageId = callback.message?.message_id;
      const data = callback.data;

      if (data === "captcha_ok") {
        // Delete captcha message
        await fetch(`https://api.telegram.org/bot${botToken}/deleteMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: chatId, message_id: messageId }),
        });

        // Mark user as verified in profiles (set language_code to include verified flag)
        // We use a custom approach: check if profile exists, if not the user-data function will create it
        // For now, store verified state by creating a minimal profile entry
        // Mark user as bot_verified
        await fetch(`${supabaseUrl}/rest/v1/profiles?telegram_id=eq.${callback.from?.id}`, {
          method: "PATCH",
          headers: {
            "apikey": supabaseKey,
            "Authorization": `Bearer ${supabaseKey}`,
            "Content-Type": "application/json",
            "Prefer": "return=minimal",
          },
          body: JSON.stringify({ bot_verified: true }),
        });

        // If no profile exists yet, create one
        const checkRes = await fetch(`${supabaseUrl}/rest/v1/profiles?telegram_id=eq.${callback.from?.id}&select=id`, {
          headers: { "apikey": supabaseKey, "Authorization": `Bearer ${supabaseKey}` },
        });
        const checkProfiles = await checkRes.json();
        if (!checkProfiles || checkProfiles.length === 0) {
          await fetch(`${supabaseUrl}/rest/v1/profiles`, {
            method: "POST",
            headers: {
              "apikey": supabaseKey,
              "Authorization": `Bearer ${supabaseKey}`,
              "Content-Type": "application/json",
              "Prefer": "return=minimal",
            },
            body: JSON.stringify({
              telegram_id: callback.from?.id,
              first_name: callback.from?.first_name || null,
              username: callback.from?.username || null,
              bot_verified: true,
            }),
          });
        }

        // Send welcome
        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            text: WELCOME_MESSAGE,
            parse_mode: "HTML",
            reply_markup: {
              inline_keyboard: [
                [{ text: "🛍 Открыть магазин", url: "https://t.me/Temka_Store_Bot/app" }],
                [{ text: "📢 Наш канал", url: "https://t.me/TemkaStoreNews" }],
              ],
            },
          }),
        });

        await fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ callback_query_id: callback.id, text: "✅ Проверка пройдена!" }),
        });
      } else if (data === "captcha_fail") {
        await fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            callback_query_id: callback.id,
            text: "Вы не прошли проверку!",
            show_alert: true,
          }),
        });
      }

      return new Response("ok", { status: 200 });
    }

    // --- Handle /start command ---
    const message = update.message;
    if (!message) return new Response("ok", { status: 200 });

    const chatId = message.chat.id;
    const telegramId = message.from?.id;
    const text = message.text?.trim();

    if (text === "/start" || text?.startsWith("/start ")) {
      // Check if user already passed captcha (bot_verified = true)
      const profileRes = await fetch(`${supabaseUrl}/rest/v1/profiles?telegram_id=eq.${telegramId}&select=id,bot_verified`, {
        headers: { "apikey": supabaseKey, "Authorization": `Bearer ${supabaseKey}` },
      });
      const profileText = await profileRes.text();
      console.log("[Bot] Profile lookup for", telegramId, ":", profileRes.status, profileText);
      
      let isVerified = false;
      try {
        const profiles = JSON.parse(profileText);
        if (profiles && profiles.length > 0 && profiles[0].bot_verified === true) {
          isVerified = true;
        }
      } catch (e) {
        console.error("[Bot] Failed to parse profiles:", e);
      }

      if (isVerified) {
        // Returning user — send welcome directly, no captcha
        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            text: WELCOME_MESSAGE,
            parse_mode: "HTML",
            reply_markup: {
              inline_keyboard: [
                [{ text: "🛍 Открыть магазин", url: "https://t.me/Temka_Store_Bot/app" }],
                [{ text: "📢 Наш канал", url: "https://t.me/TemkaStoreNews" }],
              ],
            },
          }),
        });
      } else {
        // New user — show captcha
        const captcha = buildCaptcha();
        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            text: captcha.text,
            reply_markup: {
              inline_keyboard: [captcha.buttons],
            },
          }),
        });
      }
    }

    return new Response("ok", { status: 200 });
  } catch (error) {
    console.error("[TelegramBot] Error:", error);
    return new Response("ok", { status: 200 });
  }
});
