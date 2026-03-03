import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Через сколько минут бездействия отправлять напоминание
const REMINDER_DELAY_MINUTES = 30;

interface CartItem {
  product: { id: string; name: string; price: number };
  quantity: number;
  overridePrice?: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
    if (!botToken) return json({ error: "Bot token not configured" }, 500);

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const cutoffTime = new Date(Date.now() - REMINDER_DELAY_MINUTES * 60 * 1000).toISOString();

    // Ищем брошенные корзины: не обновлялась дольше порога + напоминание ещё не отправлено
    const { data: abandonedCarts, error } = await supabase
      .from("cart_sessions")
      .select(
        `
        id, user_id, items, total, updated_at,
        profiles!inner(telegram_id, first_name, is_banned)
      `,
      )
      .eq("reminder_sent", false)
      .lt("updated_at", cutoffTime);

    if (error) {
      console.error("[cart-reminder] Fetch error:", error);
      return json({ error: error.message }, 500);
    }

    if (!abandonedCarts || abandonedCarts.length === 0) {
      return json({ success: true, sent: 0 });
    }

    console.log(`[cart-reminder] Found ${abandonedCarts.length} abandoned carts`);

    let sent = 0;
    let failed = 0;

    for (const cart of abandonedCarts) {
      const profile = cart.profiles as unknown as {
        telegram_id: number;
        first_name: string;
        is_banned: boolean;
      };

      if (profile.is_banned) continue;

      const items = cart.items as CartItem[];
      if (!items || items.length === 0) continue;

      const total = parseFloat(String(cart.total));
      const firstName = profile.first_name || "Покупатель";

      // Формируем список товаров (максимум 5 строк)
      const itemLines = items
        .slice(0, 5)
        .map((item) => {
          const price = item.overridePrice || item.product.price;
          const qty = item.quantity > 1 ? ` × ${item.quantity}` : "";
          return `• ${item.product.name}${qty} — ${(price * item.quantity).toFixed(0)}₽`;
        })
        .join("\n");

      const moreItems = items.length > 5 ? `\n_...и ещё ${items.length - 5} товар(а)_` : "";

      const text =
        `🛒 *${firstName}, вы забыли товары в корзине!*\n\n` +
        `${itemLines}${moreItems}\n\n` +
        `💰 *Итого: ${total.toFixed(0)}₽*\n\n` +
        `Товары ждут вас — завершите покупку! 🔥`;

      try {
        const tgRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: profile.telegram_id,
            text,
            parse_mode: "Markdown",
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text: "🛒 Перейти к корзине",
                    url: "https://t.me/temka_store_robot/app?startapp=cart",
                  },
                ],
              ],
            },
          }),
        });

        const tgData = await tgRes.json();

        if (tgData.ok) {
          await supabase
            .from("cart_sessions")
            .update({ reminder_sent: true, reminder_sent_at: new Date().toISOString() })
            .eq("id", cart.id);
          sent++;
          console.log(`[cart-reminder] Sent to ${profile.telegram_id}`);
        } else {
          console.error(`[cart-reminder] TG error for ${profile.telegram_id}:`, tgData.description);
          // Если пользователь заблокировал бота — не пытаемся снова
          if (tgData.error_code === 403) {
            await supabase
              .from("cart_sessions")
              .update({ reminder_sent: true, reminder_sent_at: new Date().toISOString() })
              .eq("id", cart.id);
          }
          failed++;
        }
      } catch (e) {
        console.error(`[cart-reminder] Network error:`, e);
        failed++;
      }

      // Небольшая пауза между отправками
      await new Promise((r) => setTimeout(r, 100));
    }

    console.log(`[cart-reminder] Done. Sent: ${sent}, Failed: ${failed}`);
    return json({ success: true, sent, failed, total: abandonedCarts.length });
  } catch (error) {
    console.error("[cart-reminder] Unexpected error:", error);
    return json({ error: "Internal server error" }, 500);
  }
});
