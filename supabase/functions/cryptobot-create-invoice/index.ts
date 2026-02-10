import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CRYPTOBOT_API_URL = "https://pay.crypt.bot/api";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { userId, amount, orderId, description, balanceToUse } = await req.json();

    if (!userId || !amount) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const cryptoBotToken = Deno.env.get("CRYPTOBOT_API_TOKEN");
    if (!cryptoBotToken) {
      console.error("CRYPTOBOT_API_TOKEN not configured");
      return new Response(
        JSON.stringify({ error: "Payment service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get app URL for callback
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const webhookUrl = `${supabaseUrl}/functions/v1/cryptobot-webhook`;

    // Create invoice via CryptoBot API
    const invoiceResponse = await fetch(`${CRYPTOBOT_API_URL}/createInvoice`, {
      method: "POST",
      headers: {
        "Crypto-Pay-API-Token": cryptoBotToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        asset: "USDT", // Primary currency
        amount: (amount / 90).toFixed(2), // Convert RUB to USDT (approximate rate)
        description: description || `Пополнение баланса TEMKA.STORE`,
        hidden_message: `Спасибо за пополнение! Баланс обновлён.`,
        paid_btn_name: "callback",
        paid_btn_url: webhookUrl,
        payload: JSON.stringify({ userId, orderId, amountRub: amount, balanceToUse: balanceToUse || 0 }),
        allow_comments: false,
        allow_anonymous: false,
        expires_in: 3600, // 1 hour
      }),
    });

    const invoiceData = await invoiceResponse.json();

    if (!invoiceData.ok) {
      console.error("CryptoBot error:", invoiceData);
      return new Response(
        JSON.stringify({ error: "Failed to create invoice" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const invoice = invoiceData.result;

    // Store transaction as pending
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Create pending order if not exists
    if (!orderId) {
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          user_id: userId,
          status: "pending",
          total: amount,
          payment_method: "cryptobot",
          payment_id: invoice.invoice_id.toString(),
        })
        .select()
        .single();

      if (orderError) {
        console.error("Order creation error:", orderError);
      }
    }

    // Update order with payment_id if orderId was provided
    if (orderId) {
      await supabase
        .from("orders")
        .update({ payment_id: invoice.invoice_id.toString() })
        .eq("id", orderId);
    }

    console.log(`Invoice created: ${invoice.invoice_id} for user ${userId}`);

    return new Response(
      JSON.stringify({
        success: true,
        invoiceId: invoice.invoice_id,
        payUrl: invoice.pay_url,
        miniAppUrl: invoice.mini_app_invoice_url,
        expiresAt: invoice.expiration_date,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Invoice creation error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
