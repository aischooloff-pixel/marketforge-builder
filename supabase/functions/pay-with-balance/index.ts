import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    // Check expiry (1 hour)
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

interface CartItem {
  productId: string;
  productName: string;
  price: number;
  quantity: number;
  options?: Record<string, unknown>;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { initData, items, total } = body;

    // SECURITY: Require Telegram initData for identity verification
    if (!initData || !items || !total) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
    if (!botToken) {
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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

    // Resolve userId from verified telegramId (NOT from client)
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, balance")
      .eq("telegram_id", verification.telegramId)
      .single();

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ error: "User not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = profile.id;
    const currentBalance = parseFloat(String(profile.balance)) || 0;

    // ====== SERVER-SIDE PRICE VALIDATION ======
    const productIds = (items as CartItem[]).map(i => i.productId).filter(Boolean);
    if (productIds.length > 0) {
      const { data: dbProducts } = await supabase
        .from("products")
        .select("id, price")
        .in("id", productIds);

      if (!dbProducts || dbProducts.length === 0) {
        return new Response(
          JSON.stringify({ error: "Товары не найдены" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const priceMap = new Map(dbProducts.map((p: any) => [p.id, parseFloat(p.price)]));
      let calculatedTotal = 0;
      for (const item of items as CartItem[]) {
        const realPrice = priceMap.get(item.productId);
        if (realPrice === undefined) {
          return new Response(
            JSON.stringify({ error: `Товар "${item.productName}" не найден` }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        calculatedTotal += realPrice * (item.quantity || 1);
      }

      if (Math.abs(total - calculatedTotal) > 1) {
        console.error(`Price mismatch: client sent ${total}, server calculated ${calculatedTotal}`);
        return new Response(
          JSON.stringify({ error: "Сумма не совпадает с реальными ценами товаров" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    if (currentBalance < total) {
      return new Response(
        JSON.stringify({ error: "Недостаточно средств на балансе" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check stock availability and max_per_user limits
    for (const item of items as CartItem[]) {

      // Check if this is an API-based product (e.g., px6 proxy) — skip product_items stock check
      const { data: productInfo } = await supabase
        .from("products")
        .select("tags, max_per_user")
        .eq("id", item.productId)
        .single();

      const tags: string[] = productInfo?.tags || [];
      const isApiProduct = tags.some((t: string) => t.startsWith("api:"));

      if (!isApiProduct) {
        const { count: fileCount } = await supabase
          .from("product_items")
          .select("*", { count: "exact", head: true })
          .eq("product_id", item.productId)
          .not("file_url", "is", null);

        const isUnlimited = (fileCount || 0) > 0;

        if (!isUnlimited) {
          const { count: availableStock } = await supabase
            .from("product_items")
            .select("*", { count: "exact", head: true })
            .eq("product_id", item.productId)
            .eq("is_sold", false);

          if ((availableStock || 0) < item.quantity) {
            return new Response(
              JSON.stringify({ error: `Товар "${item.productName}" — в наличии только ${availableStock || 0} шт` }),
              { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        }
      }

      if (productInfo && productInfo.max_per_user > 0) {
        const { count } = await supabase
          .from("order_items")
          .select("*, orders!inner(user_id, status)", { count: "exact", head: true })
          .eq("product_id", item.productId)
          .eq("orders.user_id", userId)
          .in("orders.status", ["paid", "completed"]);

        if ((count || 0) >= productInfo.max_per_user) {
          return new Response(
            JSON.stringify({ error: `Товар "${item.productName}" можно купить только ${productInfo.max_per_user} раз(а)` }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
    }

    // Create order
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        user_id: userId,
        total,
        status: "paid",
        payment_method: "balance",
      })
      .select()
      .single();

    if (orderError) {
      console.error("Order creation error:", orderError);
      return new Response(
        JSON.stringify({ error: "Не удалось создать заказ" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create order items
    const orderItems = (items as CartItem[]).map((item) => {
      return {
        order_id: order.id,
        product_id: item.productId,
        product_name: item.productName,
        price: item.price * item.quantity,
        quantity: item.quantity,
        options: item.options || {},
      };
    });

    await supabase.from("order_items").insert(orderItems);

    // Deduct balance
    const newBalance = currentBalance - total;
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ balance: newBalance })
      .eq("id", userId);

    if (updateError) {
      console.error("Balance update error:", updateError);
      return new Response(
        JSON.stringify({ error: "Ошибка списания баланса" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create transaction record
    await supabase.from("transactions").insert({
      user_id: userId,
      type: "purchase",
      amount: -total,
      balance_after: newBalance,
      order_id: order.id,
      description: `Оплата заказа #${order.id.substring(0, 8)}`,
    });

    // Trigger auto-delivery
    await supabase.functions.invoke("process-order", {
      body: { orderId: order.id },
    });

    // Удаляем брошенную корзину — пользователь оплатил
    await supabase.from("cart_sessions").delete().eq("user_id", userId);

    console.log(`[PayWithBalance] Order ${order.id} completed for user ${userId}, balance: ${currentBalance} -> ${newBalance}`);

    return new Response(
      JSON.stringify({ success: true, orderId: order.id, newBalance }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Pay with balance error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
