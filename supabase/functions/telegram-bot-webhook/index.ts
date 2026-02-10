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

const CAPTCHA_ITEMS: [string, string][] = [
  ["🍎", "Яблоко"], ["🚗", "Машину"], ["🎒", "Рюкзак"], ["⭐", "Звезду"],
  ["🎸", "Гитару"], ["🌻", "Подсолнух"], ["🍕", "Пиццу"], ["🏀", "Мяч"],
  ["🎧", "Наушники"], ["🐱", "Кота"], ["🌈", "Радугу"], ["🔑", "Ключ"],
  ["🎂", "Торт"], ["☂️", "Зонт"], ["💎", "Алмаз"], ["🦋", "Бабочку"],
  ["🍉", "Арбуз"], ["🎯", "Мишень"],
];

// In-memory store for pending reviews (rating chosen, waiting for text)
const pendingReviews = new Map<number, { rating: number; orderId: string }>();

function buildCaptcha() {
  const shuffled = [...CAPTCHA_ITEMS].sort(() => Math.random() - 0.5);
  const options = shuffled.slice(0, 3);
  const correctIdx = Math.floor(Math.random() * 3);
  const correct = options[correctIdx];
  const text = `🤖 Привет! Чтобы убедиться, что вы не робот — пройдите проверку.\n\nНажми на ${correct[0]} ${correct[1]}`;
  const buttons = options.map(([emoji], i) => ({
    text: emoji,
    callback_data: i === correctIdx ? "captcha_ok" : "captcha_fail",
  }));
  return { text, buttons };
}

async function tg(botToken: string, method: string, body: Record<string, unknown>) {
  return fetch(`https://api.telegram.org/bot${botToken}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
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

    // --- Handle callback_query ---
    const callback = update.callback_query;
    if (callback) {
      const chatId = callback.message?.chat?.id;
      const messageId = callback.message?.message_id;
      const data = callback.data as string;
      const fromId = callback.from?.id;

      // --- Captcha ---
      if (data === "captcha_ok") {
        await tg(botToken, "deleteMessage", { chat_id: chatId, message_id: messageId });

        // Mark bot_verified
        await fetch(`${supabaseUrl}/rest/v1/profiles?telegram_id=eq.${fromId}`, {
          method: "PATCH",
          headers: { "apikey": supabaseKey, "Authorization": `Bearer ${supabaseKey}`, "Content-Type": "application/json", "Prefer": "return=minimal" },
          body: JSON.stringify({ bot_verified: true }),
        });

        // Create profile if not exists
        const checkRes = await fetch(`${supabaseUrl}/rest/v1/profiles?telegram_id=eq.${fromId}&select=id`, {
          headers: { "apikey": supabaseKey, "Authorization": `Bearer ${supabaseKey}` },
        });
        const checkProfiles = await checkRes.json();
        if (!checkProfiles || checkProfiles.length === 0) {
          await fetch(`${supabaseUrl}/rest/v1/profiles`, {
            method: "POST",
            headers: { "apikey": supabaseKey, "Authorization": `Bearer ${supabaseKey}`, "Content-Type": "application/json", "Prefer": "return=minimal" },
            body: JSON.stringify({ telegram_id: fromId, first_name: callback.from?.first_name || null, username: callback.from?.username || null, bot_verified: true }),
          });
        }

        await tg(botToken, "sendMessage", {
          chat_id: chatId, text: WELCOME_MESSAGE, parse_mode: "HTML",
          reply_markup: { inline_keyboard: [
            [{ text: "🛍 Открыть магазин", url: "https://t.me/Temka_Store_Bot/app" }],
            [{ text: "📢 Наш канал", url: "https://t.me/TemkaStoreNews" }],
          ]},
        });
        await tg(botToken, "answerCallbackQuery", { callback_query_id: callback.id, text: "✅ Проверка пройдена!" });

      } else if (data === "captcha_fail") {
        await tg(botToken, "answerCallbackQuery", { callback_query_id: callback.id, text: "Вы не прошли проверку!", show_alert: true });

      // --- Review: start ---
      } else if (data.startsWith("review_start:")) {
        const orderId = data.split(":")[1];
        await tg(botToken, "answerCallbackQuery", { callback_query_id: callback.id });
        await tg(botToken, "sendMessage", {
          chat_id: chatId,
          text: "⭐ Оцените покупку от 1 до 5:",
          reply_markup: {
            inline_keyboard: [[
              { text: "1 ⭐", callback_data: `review_rate:${orderId}:1` },
              { text: "2 ⭐", callback_data: `review_rate:${orderId}:2` },
              { text: "3 ⭐", callback_data: `review_rate:${orderId}:3` },
              { text: "4 ⭐", callback_data: `review_rate:${orderId}:4` },
              { text: "5 ⭐", callback_data: `review_rate:${orderId}:5` },
            ]],
          },
        });

      // --- Review: rating chosen ---
      } else if (data.startsWith("review_rate:")) {
        const parts = data.split(":");
        const orderId = parts[1];
        const rating = parseInt(parts[2], 10);

        // Store pending review for this user
        pendingReviews.set(fromId, { rating, orderId });

        // Delete rating buttons
        await tg(botToken, "deleteMessage", { chat_id: chatId, message_id: messageId });
        await tg(botToken, "answerCallbackQuery", { callback_query_id: callback.id });

        const stars = "⭐".repeat(rating);
        await tg(botToken, "sendMessage", {
          chat_id: chatId,
          text: `Вы выбрали: ${stars}\n\n✏️ Напишите текст отзыва:`,
          reply_markup: { force_reply: true, selective: true },
        });
      }

      return new Response("ok", { status: 200 });
    }

    // --- Handle messages ---
    const message = update.message;
    if (!message) return new Response("ok", { status: 200 });

    const chatId = message.chat.id;
    const telegramId = message.from?.id;
    const text = message.text?.trim();

    // --- Check for pending review text ---
    if (telegramId && pendingReviews.has(telegramId) && text && !text.startsWith("/")) {
      const pending = pendingReviews.get(telegramId)!;
      pendingReviews.delete(telegramId);

      // Get user profile id
      const profileRes = await fetch(`${supabaseUrl}/rest/v1/profiles?telegram_id=eq.${telegramId}&select=id`, {
        headers: { "apikey": supabaseKey, "Authorization": `Bearer ${supabaseKey}` },
      });
      const profiles = await profileRes.json();
      const userId = profiles?.[0]?.id;

      if (userId) {
        // Insert review with status=pending
        const insertRes = await fetch(`${supabaseUrl}/rest/v1/reviews`, {
          method: "POST",
          headers: { "apikey": supabaseKey, "Authorization": `Bearer ${supabaseKey}`, "Content-Type": "application/json", "Prefer": "return=minimal" },
          body: JSON.stringify({
            user_id: userId,
            rating: pending.rating,
            text: text.substring(0, 1000),
            status: "pending",
          }),
        });

        if (insertRes.ok) {
          await tg(botToken, "sendMessage", {
            chat_id: chatId,
            text: "✅ Спасибо за отзыв! Он отправлен на модерацию и будет опубликован после проверки.",
            reply_markup: { inline_keyboard: [[{ text: "🛍 Вернуться в магазин", url: "https://t.me/Temka_Store_Bot/app" }]] },
          });
        } else {
          console.error("[Bot] Failed to insert review:", await insertRes.text());
          await tg(botToken, "sendMessage", { chat_id: chatId, text: "❌ Не удалось сохранить отзыв. Попробуйте позже." });
        }
      } else {
        await tg(botToken, "sendMessage", { chat_id: chatId, text: "❌ Профиль не найден. Сначала откройте магазин." });
      }

      return new Response("ok", { status: 200 });
    }

    // --- /start command ---
    if (text === "/start" || text?.startsWith("/start ")) {
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
        await tg(botToken, "sendMessage", {
          chat_id: chatId, text: WELCOME_MESSAGE, parse_mode: "HTML",
          reply_markup: { inline_keyboard: [
            [{ text: "🛍 Открыть магазин", url: "https://t.me/Temka_Store_Bot/app" }],
            [{ text: "📢 Наш канал", url: "https://t.me/TemkaStoreNews" }],
          ]},
        });
      } else {
        const captcha = buildCaptcha();
        await tg(botToken, "sendMessage", {
          chat_id: chatId, text: captcha.text,
          reply_markup: { inline_keyboard: [captcha.buttons] },
        });
      }
    }

    return new Response("ok", { status: 200 });
  } catch (error) {
    console.error("[TelegramBot] Error:", error);
    return new Response("ok", { status: 200 });
  }
});
