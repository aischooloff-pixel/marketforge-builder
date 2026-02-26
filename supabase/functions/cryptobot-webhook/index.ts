import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, crypto-pay-api-signature",
};

// ============ CRYPTOBOT SIGNATURE VERIFICATION ============

function arrayBufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function verifyCryptoBotSignature(
  bodyText: string,
  signatureHeader: string | null,
  apiToken: string
): Promise<boolean> {
  if (!signatureHeader) return false;

  try {
    const encoder = new TextEncoder();

    // CryptoBot signature: HMAC-SHA-256(SHA-256(api_token), body)
    const tokenHash = await crypto.subtle.digest("SHA-256", encoder.encode(apiToken));
    const key = await crypto.subtle.importKey(
      "raw", tokenHash,
      { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
    );
    const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(bodyText));
    const calculated = arrayBufferToHex(sig);

    return calculated === signatureHeader.toLowerCase();
  } catch (e) {
    console.error("Signature verification error:", e);
    return false;
  }
}

// ============ MAIN HANDLER ============

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const cryptoBotToken = Deno.env.get("CRYPTOBOT_API_TOKEN");
    if (!cryptoBotToken) {
      console.error("CRYPTOBOT_API_TOKEN not configured");
      return new Response("Configuration error", { status: 500 });
    }

    const bodyText = await req.text();

    // SECURITY: Verify CryptoBot webhook signature
    const signature = req.headers.get("crypto-pay-api-signature");
    const isValid = await verifyCryptoBotSignature(bodyText, signature, cryptoBotToken);

    if (!isValid) {
      console.error("Invalid CryptoBot webhook signature");
      return new Response("Forbidden", { status: 403 });
    }

    const update = JSON.parse(bodyText);
    console.log("CryptoBot webhook received (verified):", JSON.stringify(update));

    if (update.update_type !== "invoice_paid") {
      return new Response("OK", { status: 200 });
    }

    const invoice = update.payload;
    const payloadData = JSON.parse(invoice.payload || "{}");
    const { userId, orderId, amountRub, balanceToUse, items } = payloadData;

    if (!userId || !amountRub) {
      console.error("Missing payload data");
      return new Response("Invalid payload", { status: 400 });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Idempotency check: prevent double-processing
    const { data: existingOrder } = await supabase
      .from("orders")
      .select("status")
      .eq("payment_id", invoice.invoice_id.toString())
      .single();

    if (existingOrder && existingOrder.status !== "pending") {
      console.log(`Invoice ${invoice.invoice_id} already processed, skipping`);
      return new Response("OK", { status: 200 });
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("balance")
      .eq("id", userId)
      .single();

    if (profileError) {
      console.error("Profile fetch error:", profileError);
      return new Response("User not found", { status: 404 });
    }

    const currentBalance = parseFloat(profile.balance) || 0;
    const balanceDeduction = parseFloat(balanceToUse) || 0;

    // Crypto payment is external — do NOT add it to balance.
    // Only deduct the balance portion the user chose to use.
    const finalBalance = currentBalance - balanceDeduction;

    if (balanceDeduction > 0) {
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ balance: finalBalance })
        .eq("id", userId);

      if (updateError) {
        console.error("Balance update error:", updateError);
        return new Response("Balance update failed", { status: 500 });
      }

      // Transaction for balance portion of the payment
      await supabase.from("transactions").insert({
        user_id: userId,
        type: "purchase",
        amount: -balanceDeduction,
        balance_after: finalBalance,
        order_id: orderId || null,
        description: `Оплата заказа (баланс): ${balanceDeduction}₽`,
        payment_id: invoice.invoice_id.toString(),
      });
    }

    const isDeposit = !items || !Array.isArray(items) || items.length === 0;

    if (orderId) {
      // SECURITY: Only mark order as paid if its payment_id matches this invoice
      const { data: matchedOrder } = await supabase
        .from("orders")
        .select("id")
        .eq("id", orderId)
        .eq("payment_id", invoice.invoice_id.toString())
        .eq("status", "pending")
        .maybeSingle();

      if (matchedOrder) {
        if (isDeposit) {
          // This is a balance top-up — credit amountRub to user balance
          const depositAmount = parseFloat(amountRub);
          const newBalance = currentBalance - balanceDeduction + depositAmount;

          await supabase
            .from("profiles")
            .update({ balance: newBalance })
            .eq("id", userId);

          await supabase.from("transactions").insert({
            user_id: userId,
            type: "deposit",
            amount: depositAmount,
            balance_after: newBalance,
            order_id: orderId,
            description: `Пополнение баланса: ${depositAmount}₽`,
            payment_id: invoice.invoice_id.toString(),
          });

          await supabase.from("orders").update({
            status: "completed",
            completed_at: new Date().toISOString(),
            delivered_content: `Пополнение баланса на ${depositAmount}₽`,
          }).eq("id", matchedOrder.id);

          console.log(`[CryptoBot] Deposit ${depositAmount} RUB for user ${userId}`);
        } else {
          // Product purchase — mark paid and trigger delivery
          await supabase.from("orders").update({ status: "paid" }).eq("id", matchedOrder.id);

          try {
            const { error: processError } = await supabase.functions.invoke("process-order", {
              body: { orderId },
            });
            if (processError) {
              console.error(`[CryptoBot] process-order failed for ${orderId}:`, processError);
            }
          } catch (e) {
            console.error(`[CryptoBot] process-order exception for ${orderId}:`, e);
          }
        }
      } else {
        console.warn(`[CryptoBot] Order ${orderId} not matched or already processed (invoice ${invoice.invoice_id})`);
      }
    } else {
      // No orderId — find order by payment_id
      const { data: foundOrder } = await supabase
        .from("orders")
        .select("id")
        .eq("payment_id", invoice.invoice_id.toString())
        .eq("status", "pending")
        .maybeSingle();

      if (isDeposit) {
        const depositAmount = parseFloat(amountRub);
        const newBalance = currentBalance - balanceDeduction + depositAmount;

        await supabase
          .from("profiles")
          .update({ balance: newBalance })
          .eq("id", userId);

        await supabase.from("transactions").insert({
          user_id: userId,
          type: "deposit",
          amount: depositAmount,
          balance_after: newBalance,
          order_id: foundOrder?.id || null,
          description: `Пополнение баланса: ${depositAmount}₽`,
          payment_id: invoice.invoice_id.toString(),
        });

        if (foundOrder) {
          await supabase.from("orders").update({
            status: "completed",
            completed_at: new Date().toISOString(),
            delivered_content: `Пополнение баланса на ${depositAmount}₽`,
          }).eq("id", foundOrder.id);
        }

        console.log(`[CryptoBot] Deposit ${depositAmount} RUB for user ${userId}`);
      } else {
        if (foundOrder) {
          await supabase.from("orders").update({ status: "paid" }).eq("id", foundOrder.id);

          try {
            const { error: processError } = await supabase.functions.invoke("process-order", {
              body: { orderId: foundOrder.id },
            });
            if (processError) {
              console.error(`[CryptoBot] process-order failed for ${foundOrder.id}:`, processError);
            }
          } catch (e) {
            console.error(`[CryptoBot] process-order exception for ${foundOrder.id}:`, e);
          }
        } else {
          await supabase.from("orders")
            .update({ status: "paid" })
            .eq("payment_id", invoice.invoice_id.toString())
            .eq("status", "pending");
        }
      }
    }

    // Analytics
    await supabase.from("analytics_events").insert({
      user_id: userId,
      event_type: "payment_completed",
      event_data: {
        amount: amountRub,
        payment_id: invoice.invoice_id,
        currency: invoice.asset,
        is_deposit: isDeposit,
      },
    });

    // Удаляем брошенную корзину — пользователь оплатил
    await supabase.from("cart_sessions").delete().eq("user_id", userId);

    console.log(`Payment processed: ${amountRub} RUB for user ${userId}`);

    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response("Internal error", { status: 500 });
  }
});
