import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { orderId } = await req.json();

    if (!orderId) {
      return new Response(
        JSON.stringify({ error: "Missing orderId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log(`[ProcessOrder] Processing order: ${orderId}`);

    // Get order with items
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select(`
        *,
        order_items (*)
      `)
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      console.error("Order not found:", orderError);
      return new Response(
        JSON.stringify({ error: "Order not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if order is already completed
    if (order.status === "completed") {
      return new Response(
        JSON.stringify({ success: true, message: "Order already completed", deliveredContent: order.delivered_content }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Process each order item
    const deliveredItems: string[] = [];

    for (const item of order.order_items) {
      const quantity = item.quantity || 1;

      // Get available product items
      const { data: productItems, error: itemsError } = await supabase
        .from("product_items")
        .select("*")
        .eq("product_id", item.product_id)
        .eq("is_sold", false)
        .limit(quantity);

      if (itemsError) {
        console.error(`Error fetching items for product ${item.product_id}:`, itemsError);
        continue;
      }

      if (!productItems || productItems.length < quantity) {
        console.warn(`Insufficient stock for product ${item.product_id}: need ${quantity}, have ${productItems?.length || 0}`);
        // Still deliver what we have
      }

      // Mark items as sold and collect content
      for (const productItem of productItems || []) {
        const { error: updateError } = await supabase
          .from("product_items")
          .update({
            is_sold: true,
            sold_at: new Date().toISOString(),
            sold_to: order.user_id,
            order_id: orderId,
          })
          .eq("id", productItem.id);

        if (!updateError) {
          deliveredItems.push(`📦 ${item.product_name}:\n${productItem.content}`);
        }
      }
    }

    // Update order status
    const deliveredContent = deliveredItems.join("\n\n---\n\n");
    
    const { error: updateOrderError } = await supabase
      .from("orders")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        delivered_content: deliveredContent,
      })
      .eq("id", orderId);

    if (updateOrderError) {
      console.error("Failed to update order:", updateOrderError);
    }

    console.log(`[ProcessOrder] Order ${orderId} completed with ${deliveredItems.length} items`);

    return new Response(
      JSON.stringify({
        success: true,
        orderId,
        itemsDelivered: deliveredItems.length,
        deliveredContent,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Process order error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
