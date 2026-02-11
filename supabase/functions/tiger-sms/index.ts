import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TIGER_API = "https://api.tiger-sms.com/stubs/handler_api.php";

async function tigerRequest(params: Record<string, string>): Promise<string> {
  const apiKey = Deno.env.get("TIGER_SMS_API_KEY");
  if (!apiKey) throw new Error("TIGER_SMS_API_KEY not configured");

  const url = new URL(TIGER_API);
  url.searchParams.set("api_key", apiKey);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }

  const res = await fetch(url.toString());
  return await res.text();
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
    const { action, service, country, activationId, userId, status: statusCode } = body;

    // ── getBalance ──
    if (action === "getBalance") {
      const result = await tigerRequest({ action: "getBalance" });
      if (result.startsWith("ACCESS_BALANCE:")) {
        return json({ balance: parseFloat(result.split(":")[1]) });
      }
      return json({ error: result }, 400);
    }

    // ── getPrices ──
    if (action === "getPrices") {
      const params: Record<string, string> = { action: "getPrices" };
      if (service) params.service = service;
      if (country) params.country = country.toString();
      const result = await tigerRequest(params);
      try {
        const data = JSON.parse(result);
        return json({ prices: data });
      } catch {
        return json({ error: result }, 400);
      }
    }

    // ── getNumber ── buy a virtual number + deduct balance
    if (action === "getNumber") {
      if (!service || !country) {
        return json({ error: "service and country required" }, 400);
      }
      if (!userId) {
        return json({ error: "userId required" }, 400);
      }

      const supabase = getSupabase();
      const price = body.price || 0;

      // Check user balance
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("balance, telegram_id")
        .eq("id", userId)
        .single();

      if (profileError || !profile) {
        return json({ error: "Пользователь не найден" }, 400);
      }

      if (price > 0 && (profile.balance || 0) < price) {
        return json({ error: "Недостаточно средств на балансе" }, 400);
      }

      // Buy number from Tiger SMS
      const result = await tigerRequest({
        action: "getNumber",
        service,
        country: country.toString(),
      });

      // Success: ACCESS_NUMBER:$id:$number
      if (result.startsWith("ACCESS_NUMBER:")) {
        const parts = result.split(":");
        const activId = parts[1];
        const phone = parts[2];

        // Deduct balance
        if (price > 0) {
          const newBalance = (profile.balance || 0) - price;
          await supabase
            .from("profiles")
            .update({ balance: newBalance })
            .eq("id", userId);

          // Create transaction record
          await supabase.from("transactions").insert({
            user_id: userId,
            type: "purchase",
            amount: price,
            balance_after: newBalance,
            description: `Виртуальный номер (${body.serviceName || service}) — ${body.countryName || country}`,
          });
        }

        // Store in DB
        await supabase.from("virtual_numbers").insert({
          user_id: userId,
          activation_id: activId,
          phone_number: phone,
          service,
          service_name: body.serviceName || service,
          country: country.toString(),
          country_name: body.countryName || "",
          price: price,
          status: "waiting",
        });

        // Send Telegram notification with review via bot (like regular products)
        const telegramBotToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
        if (telegramBotToken && profile.telegram_id) {
          try {
            // Create a pseudo order_id for the review callback
            const reviewId = activId;
            await fetch(`https://api.telegram.org/bot${telegramBotToken}/sendMessage`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                chat_id: profile.telegram_id,
                text: `📱 Виртуальный номер получен!\n\n📋 Сервис: ${body.serviceName || service}\n📞 Номер: +${phone}\n💰 Стоимость: ${price} ₽\n\nОткройте приложение для приёма SMS-кода.`,
                reply_markup: {
                  inline_keyboard: [
                    [{ text: "📱 Мои номера", url: "https://t.me/Temka_Store_Bot/app?startapp=numbers" }],
                    [{ text: "⭐ Оставить отзыв", callback_data: `review_start:${reviewId}` }],
                  ],
                },
              }),
            });
          } catch (e) {
            console.error("[tiger-sms] Telegram notification error:", e);
          }
        }

        return json({
          success: true,
          activationId: activId,
          phoneNumber: phone,
        });
      }

      // Error responses
      const errorMap: Record<string, string> = {
        NO_NUMBERS: "Нет доступных номеров для этого сервиса и страны",
        NO_BALANCE: "Поставщик обновляет эту позицию. Попробуйте позже",
        BAD_SERVICE: "Неверный сервис",
        BAD_KEY: "Сервис временно недоступен. Попробуйте позже",
        ERROR_SQL: "Сервис временно недоступен. Попробуйте позже",
        NO_ACTIVATION: "Не удалось создать активацию",
      };

      return json({ error: errorMap[result] || `Ошибка: ${result}` }, 400);
    }

    // ── getStatus ── check SMS status
    if (action === "getStatus") {
      if (!activationId) return json({ error: "activationId required" }, 400);

      const result = await tigerRequest({
        action: "getStatus",
        id: activationId,
      });

      const supabase = getSupabase();

      if (result.startsWith("STATUS_OK:")) {
        const code = result.split(":")[1];
        await supabase
          .from("virtual_numbers")
          .update({ status: "code_received", sms_code: code, sms_full: result })
          .eq("activation_id", activationId);

        return json({ status: "code_received", code });
      }

      if (result === "STATUS_WAIT_CODE") {
        return json({ status: "waiting" });
      }
      if (result === "STATUS_WAIT_RESEND") {
        return json({ status: "wait_resend" });
      }
      if (result === "STATUS_CANCEL") {
        // Check if already cancelled to avoid double refund
        const { data: vnRow } = await supabase
          .from("virtual_numbers")
          .select("user_id, price, status")
          .eq("activation_id", activationId)
          .single();

        await supabase
          .from("virtual_numbers")
          .update({ status: "cancelled" })
          .eq("activation_id", activationId);

        // Refund if not already cancelled
        if (vnRow && vnRow.status !== "cancelled" && vnRow.price > 0) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("balance")
            .eq("id", vnRow.user_id)
            .single();

          if (profile) {
            const newBalance = (profile.balance || 0) + vnRow.price;
            await supabase
              .from("profiles")
              .update({ balance: newBalance })
              .eq("id", vnRow.user_id);

            await supabase.from("transactions").insert({
              user_id: vnRow.user_id,
              type: "refund",
              amount: vnRow.price,
              balance_after: newBalance,
              description: "Возврат за виртуальный номер (отмена поставщиком)",
            });
          }
        }

        return json({ status: "cancelled" });
      }

      return json({ status: "unknown", raw: result });
    }

    // ── setStatus ── change activation status (1=ready, 3=retry, 6=complete, 8=cancel)
    if (action === "setStatus") {
      if (!activationId) return json({ error: "activationId required" }, 400);
      const code = statusCode?.toString() || "8";

      const result = await tigerRequest({
        action: "setStatus",
        id: activationId,
        status: code,
      });

      const supabase = getSupabase();
      const statusMap: Record<string, string> = {
        "1": "ready",
        "3": "retry",
        "6": "completed",
        "8": "cancelled",
      };

      if (result.startsWith("ACCESS_")) {
        const newStatus = statusMap[code] || "unknown";
        await supabase
          .from("virtual_numbers")
          .update({
            status: newStatus,
            ...(newStatus === "completed" ? { completed_at: new Date().toISOString() } : {}),
          })
          .eq("activation_id", activationId);

        // Refund balance on cancel
        if (code === "8") {
          const { data: vnRow } = await supabase
            .from("virtual_numbers")
            .select("user_id, price")
            .eq("activation_id", activationId)
            .single();

          if (vnRow && vnRow.price > 0) {
            const { data: profile } = await supabase
              .from("profiles")
              .select("balance")
              .eq("id", vnRow.user_id)
              .single();

            if (profile) {
              const newBalance = (profile.balance || 0) + vnRow.price;
              await supabase
                .from("profiles")
                .update({ balance: newBalance })
                .eq("id", vnRow.user_id);

              await supabase.from("transactions").insert({
                user_id: vnRow.user_id,
                type: "refund",
                amount: vnRow.price,
                balance_after: newBalance,
                description: `Возврат за виртуальный номер (отмена)`,
              });
            }
          }
        }

        return json({ success: true, status: newStatus });
      }

      return json({ error: result }, 400);
    }

    // ── getCountries ── get country list from Tiger SMS
    if (action === "getCountries") {
      const result = await tigerRequest({ action: "getCountries" });
      try {
        const data = JSON.parse(result);
        return json({ countries: data });
      } catch {
        return json({ error: result }, 400);
      }
    }

    // ── getMyNumbers ── get user's virtual numbers from DB
    if (action === "getMyNumbers") {
      if (!userId) return json({ error: "userId required" }, 400);

      const supabase = getSupabase();
      const { data, error } = await supabase
        .from("virtual_numbers")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) return json({ error: error.message }, 500);
      return json({ numbers: data });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (error) {
    console.error("[tiger-sms] Error:", error);
    return json({ error: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
});
