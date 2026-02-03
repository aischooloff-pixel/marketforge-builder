import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, crypto-pay-api-signature",
};

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
    const update = JSON.parse(bodyText);
    console.log("CryptoBot webhook received:", JSON.stringify(update));

    if (update.update_type !== "invoice_paid") {
      return new Response("OK", { status: 200 });
    }

    const invoice = update.payload;
    const payloadData = JSON.parse(invoice.payload || "{}");
    const { userId, orderId, amountRub } = payloadData;

    if (!userId || !amountRub) {
      console.error("Missing payload data");
      return new Response("Invalid payload", { status: 400 });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

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
    const newBalance = currentBalance + amountRub;

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ balance: newBalance })
      .eq("id", userId);

    if (updateError) {
      console.error("Balance update error:", updateError);
      return new Response("Balance update failed", { status: 500 });
    }

    await supabase.from("transactions").insert({
      user_id: userId,
      type: "deposit",
      amount: amountRub,
      balance_after: newBalance,
      description: `Пополнение через CryptoBot`,
      payment_id: invoice.invoice_id.toString(),
    });

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

    console.log(`Payment processed: ${amountRub} RUB for user ${userId}`);

    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response("Internal error", { status: 500 });
  }
});
