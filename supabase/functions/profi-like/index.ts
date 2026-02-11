import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PROFI_API = "https://api.profi-like.ru/v1";

const EXCLUDED_CATEGORIES = ["Другие", "Trovo", "Quora", "Bluesky"];

async function profiRequest(params: Record<string, string>): Promise<any> {
  const apiKey = Deno.env.get("PROFI_LIKE_API_KEY");
  if (!apiKey) throw new Error("PROFI_LIKE_API_KEY not configured");

  const body = new URLSearchParams({ key: apiKey, ...params });
  const res = await fetch(PROFI_API, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return { error: text };
  }
}

function getSupabase() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
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
    const body = await req.json();
    const { action } = body;

    // ── getServices ── fetch all services, filtered
    if (action === "getServices") {
      const data = await profiRequest({ action: "services" });

      if (data.error) {
        return json({ error: data.error }, 400);
      }

      // Filter out excluded categories
      const filtered = (data as any[]).filter(
        (s) => !EXCLUDED_CATEGORIES.includes(s.category)
      );

      return json({ services: filtered });
    }

    // ── getBalance ──
    if (action === "getBalance") {
      const data = await profiRequest({ action: "balance", currency: "RUB" });
      return json(data);
    }

    // ── createOrder ── place a boost order
    if (action === "createOrder") {
      const { serviceId, serviceName, category, link, quantity, userId } = body;

      if (!serviceId || !link || !quantity || !userId) {
        return json({ error: "serviceId, link, quantity, userId required" }, 400);
      }

      const supabase = getSupabase();

      // Get user profile
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("balance, telegram_id")
        .eq("id", userId)
        .single();

      if (profileError || !profile) {
        return json({ error: "Пользователь не найден" }, 400);
      }

      // Calculate price: rate per 1000 * quantity / 1000
      const rate = parseFloat(body.rate) || 0;
      const price = Math.ceil((rate * quantity / 1000) * 100) / 100;

      if (price > 0 && (profile.balance || 0) < price) {
        return json({ error: "Недостаточно средств на балансе" }, 400);
      }

      // Place order via profi-like API
      const orderParams: Record<string, string> = {
        action: "add",
        service: serviceId.toString(),
        link,
        quantity: quantity.toString(),
        currency: "RUB",
      };

      const orderResult = await profiRequest(orderParams);

      if (orderResult.error) {
        return json({ error: orderResult.error }, 400);
      }

      if (!orderResult.order) {
        return json({ error: "Не удалось создать заказ на накрутку" }, 400);
      }

      const externalOrderId = orderResult.order.toString();

      // Deduct balance
      if (price > 0) {
        const newBalance = (profile.balance || 0) - price;
        await supabase
          .from("profiles")
          .update({ balance: newBalance })
          .eq("id", userId);

        await supabase.from("transactions").insert({
          user_id: userId,
          type: "purchase",
          amount: -price,
          balance_after: newBalance,
          description: `Накрутка: ${serviceName || serviceId} (${category})`,
        });
      }

      // Save to social_boost_orders
      await supabase.from("social_boost_orders").insert({
        user_id: userId,
        order_id: externalOrderId,
        service_id: parseInt(serviceId),
        service_name: serviceName || `Service #${serviceId}`,
        category: category || "Unknown",
        link,
        quantity,
        price,
        status: "processing",
      });

      // Send Telegram notification
      const telegramBotToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
      if (telegramBotToken && profile.telegram_id) {
        try {
          await fetch(`https://api.telegram.org/bot${telegramBotToken}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: profile.telegram_id,
              text: `🚀 Заказ на накрутку создан!\n\n📱 Сервис: ${category} — ${serviceName}\n🔗 Ссылка: ${link}\n📊 Количество: ${quantity}\n💰 Стоимость: ${price} ₽\n\n⏳ Ожидайте выполнения накрутки. Мы уведомим вас, когда заказ будет выполнен.`,
              reply_markup: {
                inline_keyboard: [
                  [{ text: "🛍 Вернуться в магазин", url: "https://t.me/Temka_Store_Bot/app" }],
                ],
              },
            }),
          });
        } catch (e) {
          console.error("[profi-like] Telegram notification error:", e);
        }
      }

      return json({
        success: true,
        orderId: externalOrderId,
        price,
      });
    }

    // ── checkStatus ── check order status
    if (action === "checkStatus") {
      const { orderId } = body;
      if (!orderId) return json({ error: "orderId required" }, 400);

      const data = await profiRequest({ action: "status", order: orderId });

      if (data.error) {
        return json({ error: data.error }, 400);
      }

      const supabase = getSupabase();

      // Map API status to our status
      const statusMap: Record<string, string> = {
        "Pending": "processing",
        "In progress": "in_progress",
        "Completed": "completed",
        "Partial": "partial",
        "Canceled": "cancelled",
        "Processing": "processing",
      };

      const newStatus = statusMap[data.status] || data.status?.toLowerCase() || "unknown";

      // Update DB
      await supabase
        .from("social_boost_orders")
        .update({
          status: newStatus,
          start_count: data.start_count ? parseInt(data.start_count) : null,
          remains: data.remains ? parseInt(data.remains) : null,
          ...(newStatus === "completed" || newStatus === "partial"
            ? { completed_at: new Date().toISOString() }
            : {}),
        })
        .eq("order_id", orderId);

      // If completed, send Telegram notification
      if (newStatus === "completed" || newStatus === "partial") {
        const { data: boostOrder } = await supabase
          .from("social_boost_orders")
          .select("user_id, service_name, category, quantity, link")
          .eq("order_id", orderId)
          .single();

        if (boostOrder) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("telegram_id")
            .eq("id", boostOrder.user_id)
            .single();

          const telegramBotToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
          if (telegramBotToken && profile?.telegram_id) {
            const statusEmoji = newStatus === "completed" ? "✅" : "⚠️";
            const statusText = newStatus === "completed" ? "выполнен" : "частично выполнен";
            try {
              await fetch(`https://api.telegram.org/bot${telegramBotToken}/sendMessage`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  chat_id: profile.telegram_id,
                  text: `${statusEmoji} Заказ на накрутку ${statusText}!\n\n📱 ${boostOrder.category} — ${boostOrder.service_name}\n📊 Количество: ${boostOrder.quantity}\n🔗 ${boostOrder.link}`,
                  reply_markup: {
                    inline_keyboard: [
                      [{ text: "⭐ Оставить отзыв", callback_data: `review_start:boost_${orderId}` }],
                      [{ text: "🛍 Вернуться в магазин", url: "https://t.me/Temka_Store_Bot/app" }],
                    ],
                  },
                }),
              });
            } catch (e) {
              console.error("[profi-like] Completion notification error:", e);
            }
          }
        }
      }

      return json({ status: newStatus, start_count: data.start_count, remains: data.remains });
    }

    // ── checkAllPending ── check status for all pending/in_progress orders
    if (action === "checkAllPending") {
      const supabase = getSupabase();

      const { data: pendingOrders } = await supabase
        .from("social_boost_orders")
        .select("order_id")
        .in("status", ["processing", "in_progress", "pending"])
        .not("order_id", "is", null);

      if (!pendingOrders || pendingOrders.length === 0) {
        return json({ checked: 0 });
      }

      // Check status for each (batch up to 100 via multi-status API)
      const orderIds = pendingOrders.map((o) => o.order_id).filter(Boolean);
      
      if (orderIds.length > 0) {
        const multiData = await profiRequest({
          action: "status",
          orders: orderIds.join(","),
        });

        if (!multiData.error) {
          for (const [oid, statusData] of Object.entries(multiData)) {
            const sd = statusData as any;
            if (sd.error) continue;

            const statusMap: Record<string, string> = {
              "Pending": "processing",
              "In progress": "in_progress",
              "Completed": "completed",
              "Partial": "partial",
              "Canceled": "cancelled",
              "Processing": "processing",
            };

            const newStatus = statusMap[sd.status] || sd.status?.toLowerCase() || "unknown";

            await supabase
              .from("social_boost_orders")
              .update({
                status: newStatus,
                start_count: sd.start_count ? parseInt(sd.start_count) : null,
                remains: sd.remains ? parseInt(sd.remains) : null,
                ...(newStatus === "completed" || newStatus === "partial"
                  ? { completed_at: new Date().toISOString() }
                  : {}),
              })
              .eq("order_id", oid);

            // Send completion notification
            if (newStatus === "completed" || newStatus === "partial") {
              const { data: boostOrder } = await supabase
                .from("social_boost_orders")
                .select("user_id, service_name, category, quantity, link")
                .eq("order_id", oid)
                .single();

              if (boostOrder) {
                const { data: profile } = await supabase
                  .from("profiles")
                  .select("telegram_id")
                  .eq("id", boostOrder.user_id)
                  .single();

                const telegramBotToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
                if (telegramBotToken && profile?.telegram_id) {
                  const emoji = newStatus === "completed" ? "✅" : "⚠️";
                  const txt = newStatus === "completed" ? "выполнен" : "частично выполнен";
                  try {
                    await fetch(`https://api.telegram.org/bot${telegramBotToken}/sendMessage`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        chat_id: profile.telegram_id,
                        text: `${emoji} Заказ на накрутку ${txt}!\n\n📱 ${boostOrder.category} — ${boostOrder.service_name}\n📊 Количество: ${boostOrder.quantity}\n🔗 ${boostOrder.link}`,
                      }),
                    });
                  } catch (e) {
                    console.error("[profi-like] batch notification error:", e);
                  }
                }
              }
            }
          }
        }

        return json({ checked: orderIds.length });
      }

      return json({ checked: 0 });
    }

    // ── getMyOrders ── get user's boost orders
    if (action === "getMyOrders") {
      const { userId } = body;
      if (!userId) return json({ error: "userId required" }, 400);

      const supabase = getSupabase();
      const { data, error } = await supabase
        .from("social_boost_orders")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) return json({ error: error.message }, 500);
      return json({ orders: data });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (error) {
    console.error("[profi-like] Error:", error);
    return json({ error: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
});
