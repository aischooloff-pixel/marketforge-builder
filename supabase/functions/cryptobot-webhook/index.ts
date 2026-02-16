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

    const afterDeposit = currentBalance + amountRub;
    const finalBalance = afterDeposit - balanceDeduction;

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ balance: finalBalance })
      .eq("id", userId);

    if (updateError) {
      console.error("Balance update error:", updateError);
      return new Response("Balance update failed", { status: 500 });
    }

    // Transaction for the CryptoBot deposit
    await supabase.from("transactions").insert({
      user_id: userId,
      type: "deposit",
      amount: amountRub,
      balance_after: afterDeposit,
      description: `Пополнение через CryptoBot`,
      payment_id: invoice.invoice_id.toString(),
    });

    // Transaction for the balance deduction (partial payment)
    if (balanceDeduction > 0) {
      await supabase.from("transactions").insert({
        user_id: userId,
        type: "purchase",
        amount: -balanceDeduction,
        balance_after: finalBalance,
        order_id: orderId || null,
        description: `Частичная оплата заказа (баланс)`,
      });
    }

    if (orderId) {
      await supabase.from("orders").update({ status: "paid" }).eq("id", orderId);
    } else {
      await supabase
        .from("orders")
        .update({ status: "paid" })
        .eq("payment_id", invoice.invoice_id.toString())
        .eq("status", "pending");
    }

    await supabase.from("analytics_events").insert({
      user_id: userId,
      event_type: "payment_completed",
      event_data: {
        amount: amountRub,
        payment_id: invoice.invoice_id,
        currency: invoice.asset,
      },
    });

    // Trigger auto-delivery for the order
    if (orderId) {
      await supabase.functions.invoke("process-order", {
        body: { orderId },
      });
    }

    console.log(`Payment processed: ${amountRub} RUB for user ${userId}`);

    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response("Internal error", { status: 500 });
  }
});
