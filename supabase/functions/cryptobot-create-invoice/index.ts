import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CRYPTOBOT_API_URL = "https://pay.crypt.bot/api";

// ============ TELEGRAM IDENTITY VERIFICATION ============

function arrayBufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function verifyTelegramInitData(
  initDataString: string,
  botToken: string
): Promise<{ valid: boolean; telegramId?: number }> {
  try {
    const params = new URLSearchParams(initDataString);
    const hash = params.get("hash");
    const authDate = params.get("auth_date");
    const userStr = params.get("user");
    if (!hash || !authDate) return { valid: false };

    const now = Math.floor(Date.now() / 1000);
    if (now - parseInt(authDate) > 3600) return { valid: false };

    params.delete("hash");
    const sortedParams = Array.from(params.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join("\n");

    const encoder = new TextEncoder();
    const webAppDataKey = await crypto.subtle.importKey(
      "raw", encoder.encode("WebAppData"),
      { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
    );
    const secretKeyBuffer = await crypto.subtle.sign("HMAC", webAppDataKey, encoder.encode(botToken));
    const secretKey = await crypto.subtle.importKey(
      "raw", secretKeyBuffer,
      { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
    );
    const hashBuffer = await crypto.subtle.sign("HMAC", secretKey, encoder.encode(sortedParams));
    const calculatedHash = arrayBufferToHex(hashBuffer);

    if (calculatedHash !== hash) return { valid: false };

    const user = userStr ? JSON.parse(decodeURIComponent(userStr)) : null;
    return { valid: true, telegramId: user?.id };
  } catch {
    return { valid: false };
  }
}

// ============ MAIN HANDLER ============

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { initData, amount, orderId, description, balanceToUse } = await req.json();

    if (!initData || !amount) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
    const cryptoBotToken = Deno.env.get("CRYPTOBOT_API_TOKEN");

    if (!botToken || !cryptoBotToken) {
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // SECURITY: Verify Telegram identity
    const verification = await verifyTelegramInitData(initData, botToken);
    if (!verification.valid || !verification.telegramId) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Resolve userId from verified telegramId
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("telegram_id", verification.telegramId)
      .single();

    if (!profile) {
      return new Response(
        JSON.stringify({ error: "User not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = profile.id;
    const webhookUrl = `${supabaseUrl}/functions/v1/cryptobot-webhook`;

    // Get current exchange rate from CryptoBot
    const ratesResponse = await fetch(`${CRYPTOBOT_API_URL}/getExchangeRates`, {
      headers: { "Crypto-Pay-API-Token": cryptoBotToken },
    });
    const ratesData = await ratesResponse.json();
    
    let usdtAmount: string;
    if (ratesData.ok) {
      // Find USDT -> RUB rate
      const usdtRub = ratesData.result?.find(
        (r: { source: string; target: string }) => r.source === "USDT" && r.target === "RUB"
      );
      if (usdtRub) {
        usdtAmount = (amount / parseFloat(usdtRub.rate)).toFixed(2);
      } else {
        // Fallback if rate not found
        usdtAmount = (amount / 90).toFixed(2);
      }
    } else {
      usdtAmount = (amount / 90).toFixed(2);
    }

    console.log(`Converting ${amount} RUB to ${usdtAmount} USDT`);

    // Create invoice via CryptoBot API
    const invoiceResponse = await fetch(`${CRYPTOBOT_API_URL}/createInvoice`, {
      method: "POST",
      headers: {
        "Crypto-Pay-API-Token": cryptoBotToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        asset: "USDT",
        amount: usdtAmount,
        description: description || `Пополнение баланса TEMKA.STORE`,
        hidden_message: `Спасибо за пополнение! Баланс обновлён.`,
        paid_btn_name: "callback",
        paid_btn_url: `${supabaseUrl}/functions/v1/cryptobot-webhook`,
        payload: JSON.stringify({ userId, orderId, amountRub: amount, balanceToUse: balanceToUse || 0 }),
        allow_comments: false,
        allow_anonymous: false,
        expires_in: 3600,
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

    // Create or update order with payment_id
    if (!orderId) {
      await supabase.from("orders").insert({
        user_id: userId,
        status: "pending",
        total: amount,
        payment_method: "cryptobot",
        payment_id: invoice.invoice_id.toString(),
      });
    } else {
      await supabase
        .from("orders")
        .update({ payment_id: invoice.invoice_id.toString() })
        .eq("id", orderId)
        .eq("user_id", userId); // SECURITY: ensure order belongs to user
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
