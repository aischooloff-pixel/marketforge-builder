import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const XROCKET_API = "https://pay.xrocket.tg";

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

// ============ GET USDT/RUB RATE ============

async function getUsdtRubRate(): Promise<number> {
  // Try CryptoBot rates first (already have token)
  const cryptoBotToken = Deno.env.get("CRYPTOBOT_API_TOKEN");
  if (cryptoBotToken) {
    try {
      const res = await fetch("https://pay.crypt.bot/api/getExchangeRates", {
        headers: { "Crypto-Pay-API-Token": cryptoBotToken },
      });
      const data = await res.json();
      if (data.ok) {
        const rate = data.result?.find(
          (r: { source: string; target: string }) => r.source === "USDT" && r.target === "RUB"
        );
        if (rate) return parseFloat(rate.rate);
      }
    } catch (e) {
      console.error("CryptoBot rate fetch failed:", e);
    }
  }
  // Fallback
  return 90;
}

// ============ MAIN HANDLER ============

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
    const { initData, amount, description, balanceToUse, items } = body;

    if (!initData || !amount) {
      return json({ error: "Missing required fields" }, 400);
    }

    const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
    const xrocketToken = Deno.env.get("XROCKET_API_TOKEN");

    if (!botToken || !xrocketToken) {
      return json({ error: "Server configuration error" }, 500);
    }

    // Verify Telegram identity
    const verification = await verifyTelegramInitData(initData, botToken);
    if (!verification.valid || !verification.telegramId) {
      return json({ error: "Unauthorized" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Resolve userId
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("telegram_id", verification.telegramId)
      .single();

    if (!profile) {
      return json({ error: "User not found" }, 404);
    }

    const userId = profile.id;

    // Get dynamic exchange rate
    const rubRate = await getUsdtRubRate();
    const usdtAmount = (amount / rubRate).toFixed(2);

    console.log(`xRocket: Converting ${amount} RUB to ${usdtAmount} USDT (rate: ${rubRate})`);

    // Create invoice via xRocket API
    const invoiceResponse = await fetch(`${XROCKET_API}/tg-invoices`, {
      method: "POST",
      headers: {
        "Rocket-Pay-Key": xrocketToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: parseFloat(usdtAmount),
        currency: "USDT",
        description: description || "Пополнение баланса TEMKA.STORE",
        payload: JSON.stringify({
          userId,
          amountRub: amount,
          balanceToUse: balanceToUse || 0,
          items: items || [],
        }),
        callbackUrl: `${supabaseUrl}/functions/v1/xrocket-webhook`,
      }),
    });

    const invoiceData = await invoiceResponse.json();

    if (!invoiceData.success && !invoiceData.data) {
      console.error("xRocket error:", invoiceData);
      return json({ error: "Failed to create invoice" }, 500);
    }

    const invoice = invoiceData.data;

    // Create order
    const { data: newOrder } = await supabase.from("orders").insert({
      user_id: userId,
      status: "pending",
      total: amount,
      payment_method: "xrocket",
      payment_id: invoice.id?.toString(),
    }).select("id").single();

    const finalOrderId = newOrder?.id;

    // Create order_items
    if (finalOrderId && items && Array.isArray(items) && items.length > 0) {
      // Validate product_id as UUID — non-UUID IDs (e.g. Stars temp IDs) become null
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const orderItems = items.map((item: any) => ({
        order_id: finalOrderId,
        product_id: item.productId && uuidRegex.test(item.productId) ? item.productId : null,
        product_name: item.productName,
        price: item.price,
        quantity: item.quantity || 1,
        options: item.options || {},
      }));
      const { error: itemsError } = await supabase.from("order_items").insert(orderItems);
      if (itemsError) {
        console.error("Failed to insert order_items:", itemsError);
      }
    }

    console.log(`xRocket invoice created: ${invoice.id} for user ${userId}`);

    return json({
      success: true,
      orderId: finalOrderId,
      invoiceId: invoice.id,
      payUrl: invoice.link,
    });
  } catch (error) {
    console.error("xRocket invoice creation error:", error);
    return json({ error: "Internal server error" }, 500);
  }
});
