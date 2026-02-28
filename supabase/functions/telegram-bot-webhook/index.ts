import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function buildWelcomeMessage(username?: string) {
  const nameLink = username ? `<a href="https://t.me/${username}">Темщик</a>` : "Темщик";
  return `👋 <b>${nameLink}</b>, добро пожаловать в <b><a href="https://t.me/Temka_Store_Bot/app">TEMKA.STORE</a></b>!

Здесь ты можешь приобрести цифровые товары для себя или работы быстро и дешево.

🛍 Нажми кнопку ниже, чтобы открыть приложение магазина.`;
}

async function tg(botToken: string, method: string, body: Record<string, unknown>) {
  return fetch(`https://api.telegram.org/bot${botToken}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function getRequiredChannels(supabase: any) {
  const { data } = await supabase.from("required_channels").select("*").eq("is_active", true).order("sort_order");
  return data || [];
}

async function checkUserSubscriptions(botToken: string, userId: number, channels: any[]): Promise<string[]> {
  const notSubscribed: string[] = [];
  for (const ch of channels) {
    try {
      const res = await fetch(`https://api.telegram.org/bot${botToken}/getChatMember`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: ch.channel_id, user_id: userId }),
      });
      const data = await res.json();
      const status = data?.result?.status;
      if (!status || status === "left" || status === "kicked") {
        notSubscribed.push(ch.id);
      }
    } catch (e) {
      console.error(`[Bot] Failed to check membership for ${ch.channel_id}:`, e);
      notSubscribed.push(ch.id);
    }
  }
  return notSubscribed;
}

function buildSubscriptionMessage(channels: any[]) {
  const text = "📢 Не жмоться, подпишись на наши каналы:\n\nПодпишись и нажми «✅ Проверить подписку»";
  const buttons = channels.map((ch: any) => [
    {
      text: `📢 ${ch.channel_name}`,
      url: ch.channel_url,
    },
  ]);
  buttons.push([{ text: "✅ Проверить подписку", callback_data: "check_subscription" }]);
  return { text, buttons };
}

async function ensureProfile(supabaseUrl: string, supabaseKey: string, fromUser: any) {
  const telegramId = fromUser?.id;
  if (!telegramId) return;

  const checkRes = await fetch(`${supabaseUrl}/rest/v1/profiles?telegram_id=eq.${telegramId}&select=id`, {
    headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` },
  });
  const profiles = await checkRes.json();
  if (!profiles || profiles.length === 0) {
    await fetch(`${supabaseUrl}/rest/v1/profiles`, {
      method: "POST",
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        telegram_id: telegramId,
        first_name: fromUser?.first_name || null,
        username: fromUser?.username || null,
        bot_verified: true,
      }),
    });
  } else {
    // Mark verified if not already
    await fetch(`${supabaseUrl}/rest/v1/profiles?telegram_id=eq.${telegramId}`, {
      method: "PATCH",
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({ bot_verified: true }),
    });
  }
}

async function sendWelcome(botToken: string, chatId: number, username?: string) {
  await tg(botToken, "sendMessage", {
    chat_id: chatId,
    text: buildWelcomeMessage(username),
    parse_mode: "HTML",
    disable_web_page_preview: true,
    reply_markup: {
      inline_keyboard: [
        [{ text: "🛍 Открыть магазин", url: "https://t.me/Temka_Store_Bot/app" }],
        [{ text: "📢 Наш канал", url: "https://t.me/TemkaStoreNews" }],
      ],
    },
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
  const supabase = createClient(supabaseUrl, supabaseKey);

  let update: any;
  try {
    update = await req.json();
  } catch (parseErr) {
    console.error("[TelegramBot] Failed to parse request body:", parseErr);
    return new Response("ok", { status: 200 });
  }

  try {

    // --- Internal subscription check from web app ---
    if (update._checkSubscription && update.telegram_id && update.channel_id) {
      try {
        const res = await fetch(`https://api.telegram.org/bot${botToken}/getChatMember`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: update.channel_id, user_id: update.telegram_id }),
        });
        const data = await res.json();
        const status = data?.result?.status;
        const subscribed = !!status && status !== "left" && status !== "kicked";
        return new Response(JSON.stringify({ subscribed }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch {
        return new Response(JSON.stringify({ subscribed: false }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // --- Handle callback_query ---
    const callback = update.callback_query;
    if (callback) {
      const chatId = callback.message?.chat?.id;
      const messageId = callback.message?.message_id;
      const data = callback.data as string;
      const fromId = callback.from?.id;

      // --- Check subscription ---
      if (data === "check_subscription") {
        const channels = await getRequiredChannels(supabase);
        if (channels.length === 0) {
          await tg(botToken, "answerCallbackQuery", {
            callback_query_id: callback.id,
            text: "✅ Подписка подтверждена!",
          });
          await tg(botToken, "deleteMessage", { chat_id: chatId, message_id: messageId });
          await ensureProfile(supabaseUrl, supabaseKey, callback.from);
          await sendWelcome(botToken, chatId, callback.from?.username);
          return new Response("ok", { status: 200 });
        }

        const notSubscribed = await checkUserSubscriptions(botToken, fromId, channels);
        if (notSubscribed.length > 0) {
          await tg(botToken, "answerCallbackQuery", {
            callback_query_id: callback.id,
            text: "❌ Вы подписались не на все каналы!",
            show_alert: true,
          });
          return new Response("ok", { status: 200 });
        }

        // All subscribed
        await tg(botToken, "answerCallbackQuery", {
          callback_query_id: callback.id,
          text: "✅ Подписка подтверждена!",
        });
        await tg(botToken, "deleteMessage", { chat_id: chatId, message_id: messageId });
        await ensureProfile(supabaseUrl, supabaseKey, callback.from);
        await sendWelcome(botToken, chatId, callback.from?.username);
        return new Response("ok", { status: 200 });
      }

      // --- Review: start ---
      if (data.startsWith("review_start:")) {
        const orderId = data.split(":")[1];
        await tg(botToken, "answerCallbackQuery", { callback_query_id: callback.id });
        await tg(botToken, "sendMessage", {
          chat_id: chatId,
          text: "⭐ Оцените покупку от 1 до 5:",
          reply_markup: {
            inline_keyboard: [
              [
                { text: "1 ⭐", callback_data: `review_rate:${orderId}:1` },
                { text: "2 ⭐", callback_data: `review_rate:${orderId}:2` },
                { text: "3 ⭐", callback_data: `review_rate:${orderId}:3` },
                { text: "4 ⭐", callback_data: `review_rate:${orderId}:4` },
                { text: "5 ⭐", callback_data: `review_rate:${orderId}:5` },
              ],
            ],
          },
        });

        // --- Review: rating chosen ---
      } else if (data.startsWith("review_rate:")) {
        const parts = data.split(":");
        const orderId = parts[1];
        const rating = parseInt(parts[2], 10);

        await supabase.from("pending_reviews").delete().eq("telegram_id", fromId);
        await supabase.from("pending_reviews").insert({ telegram_id: fromId, rating, order_id: orderId });

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
    const { data: pendingArr } = await supabase
      .from("pending_reviews")
      .select("*")
      .eq("telegram_id", telegramId)
      .order("created_at", { ascending: false })
      .limit(1);

    const pending = pendingArr?.[0];

    if (telegramId && pending && text && !text.startsWith("/")) {
      await supabase.from("pending_reviews").delete().eq("id", pending.id);

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, first_name, username")
        .eq("telegram_id", telegramId)
        .limit(1);
      const userProfile = profiles?.[0];
      const userId = userProfile?.id;

      const authorName =
        [userProfile?.first_name, userProfile?.username ? `@${userProfile.username}` : null]
          .filter(Boolean)
          .join(" ") || "Пользователь";

      if (userId) {
        const { error: reviewErr } = await supabase.from("reviews").insert({
          user_id: userId,
          rating: pending.rating,
          text: text.substring(0, 1000),
          status: "pending",
          author_name: authorName,
        });

        if (!reviewErr) {
          await tg(botToken, "sendMessage", {
            chat_id: chatId,
            text: "✅ Спасибо за отзыв! Он отправлен на модерацию и будет опубликован после проверки.",
            reply_markup: {
              inline_keyboard: [[{ text: "🛍 Вернуться в магазин", url: "https://t.me/Temka_Store_Bot/app" }]],
            },
          });
        } else {
          console.error("[Bot] Failed to insert review:", reviewErr);
          await tg(botToken, "sendMessage", {
            chat_id: chatId,
            text: "❌ Не удалось сохранить отзыв. Попробуйте позже.",
          });
        }
      } else {
        await tg(botToken, "sendMessage", { chat_id: chatId, text: "❌ Профиль не найден. Сначала откройте магазин." });
      }

      return new Response("ok", { status: 200 });
    }

    // --- /start command ---
    if (text === "/start" || text?.startsWith("/start ")) {
      // Check required channels first
      const channels = await getRequiredChannels(supabase);
      if (channels.length > 0) {
        const notSubscribed = await checkUserSubscriptions(botToken, telegramId, channels);
        if (notSubscribed.length > 0) {
          const sub = buildSubscriptionMessage(channels);
          await tg(botToken, "sendMessage", {
            chat_id: chatId,
            text: sub.text,
            reply_markup: { inline_keyboard: sub.buttons },
          });
          return new Response("ok", { status: 200 });
        }
      }

      // Create/update profile and send welcome directly (no captcha)
      await ensureProfile(supabaseUrl, supabaseKey, message.from);
      await sendWelcome(botToken, chatId, message.from?.username);
    }

    return new Response("ok", { status: 200 });
  } catch (error) {
    console.error("[TelegramBot] Error:", error);
    return new Response("ok", { status: 200 });
  }
});
