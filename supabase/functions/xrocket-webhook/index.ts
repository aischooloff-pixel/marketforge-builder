import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, rocket-pay-signature",
};

// ============ SIGNATURE VERIFICATION ============

function arrayBufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function verifyXRocketSignature(
  bodyText: string,
  signatureHeader: string | null,
  apiToken: string
): Promise<boolean> {
  if (!signatureHeader) return false;

  try {
    const encoder = new TextEncoder();
    // xRocket signature: HMAC-SHA-256(SHA-256(api_token), body)
    const tokenHash = await crypto.subtle.digest("SHA-256", encoder.encode(apiToken));
    const key = await crypto.subtle.importKey(
      "raw", tokenHash,
      { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
    );
    const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(bodyText));
    const calculated = arrayBufferToHex(sig);

    return calculated === signatureHeader.toLowerCase();
  } catch (e) {
    console.error("xRocket signature verification error:", e);
    return false;
  }
}

// ============ MAIN HANDLER ============

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const xrocketToken = Deno.env.get("XROCKET_API_TOKEN");
    if (!xrocketToken) {
      console.error("XROCKET_API_TOKEN not configured");
      return new Response("Configuration error", { status: 500 });
    }

    const bodyText = await req.text();

    // Verify signature
    const signature = req.headers.get("rocket-pay-signature");
    const isValid = await verifyXRocketSignature(bodyText, signature, xrocketToken);

    if (!isValid) {
      console.error("Invalid xRocket webhook signature");
      return new Response("Forbidden", { status: 403 });
    }

    const update = JSON.parse(bodyText);
    console.log("xRocket webhook received (verified):", JSON.stringify(update));

    // xRocket sends status "paid" on the invoice object
    const invoice = update;
    if (invoice.status !== "paid") {
      return new Response("OK", { status: 200 });
    }

    const payloadData = JSON.parse(invoice.payload || "{}");
    const { userId, amountRub, balanceToUse } = payloadData;

    if (!userId || !amountRub) {
      console.error("Missing payload data");
      return new Response("Invalid payload", { status: 400 });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const invoiceId = invoice.id?.toString();

    // Idempotency check
    const { data: existingOrder } = await supabase
      .from("orders")
      .select("id, status")
      .eq("payment_id", invoiceId)
      .single();

    if (existingOrder && existingOrder.status !== "pending") {
      console.log(`xRocket invoice ${invoiceId} already processed, skipping`);
      return new Response("OK", { status: 200 });
    }

    const orderId = existingOrder?.id;

    // Get user profile
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("balance")
      .eq("id", userId)
      .single();

    if (profileError) {
      console.error("Profile fetch error:", profileError);
      return new Response("User not found", { status: 404 });
    }

    const currentBalance = parseFloat(profileData.balance) || 0;
    const balanceDeduction = parseFloat(balanceToUse) || 0;

    const afterDeposit = currentBalance + amountRub;
    const finalBalance = afterDeposit - balanceDeduction;

    // Update balance
    await supabase
      .from("profiles")
      .update({ balance: finalBalance })
      .eq("id", userId);

    // Transaction for deposit
    await supabase.from("transactions").insert({
      user_id: userId,
      type: "deposit",
      amount: amountRub,
      balance_after: afterDeposit,
      description: "Пополнение через xRocket",
      payment_id: invoiceId,
    });

    // Transaction for balance deduction (partial payment)
    if (balanceDeduction > 0) {
      await supabase.from("transactions").insert({
        user_id: userId,
        type: "purchase",
        amount: -balanceDeduction,
        balance_after: finalBalance,
        order_id: orderId || null,
        description: "Частичная оплата заказа (баланс)",
      });
    }

    // Update order status
    if (orderId) {
      await supabase.from("orders").update({ status: "paid" }).eq("id", orderId);
    } else {
      await supabase
        .from("orders")
        .update({ status: "paid" })
        .eq("payment_id", invoiceId)
        .eq("status", "pending");
    }

    // Analytics
    await supabase.from("analytics_events").insert({
      user_id: userId,
      event_type: "payment_completed",
      event_data: {
        amount: amountRub,
        payment_id: invoiceId,
        method: "xrocket",
        currency: "USDT",
      },
    });

    // Trigger auto-delivery
    if (orderId) {
      await supabase.functions.invoke("process-order", {
        body: { orderId },
      });
    }

    console.log(`xRocket payment processed: ${amountRub} RUB for user ${userId}`);

    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("xRocket webhook error:", error);
    return new Response("Internal error", { status: 500 });
  }
});
