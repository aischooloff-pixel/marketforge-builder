import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
    const { userId, items, total } = await req.json();

    if (!userId || !items || !total) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Verify user exists and has sufficient balance
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, balance")
      .eq("id", userId)
      .single();

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ error: "User not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const currentBalance = parseFloat(String(profile.balance)) || 0;
    if (currentBalance < total) {
      return new Response(
        JSON.stringify({ error: "Недостаточно средств на балансе" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Check stock availability and max_per_user limits
    for (const item of items as CartItem[]) {
      // Check for file-based (unlimited) items
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

      // Check max_per_user
      const { data: productData } = await supabase
        .from("products")
        .select("max_per_user")
        .eq("id", item.productId)
        .single();

      if (productData && productData.max_per_user > 0) {
        const { count } = await supabase
          .from("order_items")
          .select("*, orders!inner(user_id, status)", { count: "exact", head: true })
          .eq("product_id", item.productId)
          .eq("orders.user_id", userId)
          .in("orders.status", ["paid", "completed"]);

        if ((count || 0) >= productData.max_per_user) {
          return new Response(
            JSON.stringify({ error: `Товар "${item.productName}" можно купить только ${productData.max_per_user} раз(а)` }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
    }

    // 3. Create order
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

    // 4. Create order items
    const orderItems = (items as CartItem[]).map((item) => ({
      order_id: order.id,
      product_id: item.productId,
      product_name: item.productName,
      price: item.price * item.quantity,
      quantity: item.quantity,
      options: item.options || {},
    }));

    await supabase.from("order_items").insert(orderItems);

    // 5. Deduct balance
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

    // 6. Create transaction record
    await supabase.from("transactions").insert({
      user_id: userId,
      type: "purchase",
      amount: -total,
      balance_after: newBalance,
      order_id: order.id,
      description: `Оплата заказа #${order.id.substring(0, 8)}`,
    });

    // 7. Trigger auto-delivery
    const { data: deliveryData } = await supabase.functions.invoke("process-order", {
      body: { orderId: order.id },
    });

    console.log(`[PayWithBalance] Order ${order.id} completed for user ${userId}, balance: ${currentBalance} -> ${newBalance}`);

    return new Response(
      JSON.stringify({
        success: true,
        orderId: order.id,
        newBalance,
      }),
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
