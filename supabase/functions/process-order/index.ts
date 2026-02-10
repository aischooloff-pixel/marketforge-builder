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
    const telegramBotToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
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

    // Get user profile for Telegram delivery
    const { data: profile } = await supabase
      .from("profiles")
      .select("telegram_id")
      .eq("id", order.user_id)
      .single();

    const telegramChatId = profile?.telegram_id;

    // Process each order item
    const deliveredItems: string[] = [];
    const fileUrls: string[] = [];

    for (const item of order.order_items) {
      const quantity = item.quantity || 1;

      for (let i = 0; i < quantity; i++) {
        // Atomically claim one product item (prevents double-delivery)
        const { data: claimed, error: claimError } = await supabase
          .rpc("claim_product_item", {
            p_product_id: item.product_id,
            p_user_id: order.user_id,
            p_order_id: orderId,
          });

        if (claimError) {
          console.error(`Error claiming item for product ${item.product_id}:`, claimError);
          continue;
        }

        const claimedItem = Array.isArray(claimed) ? claimed[0] : claimed;
        if (!claimedItem) {
          console.warn(`No available items for product ${item.product_id} (needed ${quantity}, got ${i})`);
          break;
        }

        deliveredItems.push(`📦 ${item.product_name}:\n${claimedItem.content}`);
        if (claimedItem.file_url) {
          fileUrls.push(claimedItem.file_url);
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

    // Send via Telegram bot
    if (telegramBotToken && telegramChatId) {
      try {
        // Send text content
        if (deliveredContent) {
          const textMessage = `✅ Заказ #${orderId.substring(0, 8)} оплачен!\n\nВаши товары:\n\n${deliveredContent}\n\n🙏 Спасибо за покупку! Будем рады видеть вас снова.\n⭐ Оставьте, пожалуйста, отзыв — нам важно ваше мнение!`;
          await fetch(`https://api.telegram.org/bot${telegramBotToken}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: telegramChatId,
              text: textMessage.substring(0, 4096),
              parse_mode: "HTML",
              reply_markup: {
                inline_keyboard: [
                  [
                    {
                      text: "⭐ Оставить отзыв",
                      callback_data: `review_start:${orderId.substring(0, 8)}`,
                    },
                  ],
                  [
                    {
                      text: "🛍 Вернуться в магазин",
                      url: "https://t.me/Temka_Store_Bot/app",
                    },
                  ],
                ],
              },
            }),
          });
        }

        // Send files
        for (const fileUrl of fileUrls) {
          // Download file from storage
          const filePath = fileUrl.includes("/storage/v1/object/public/")
            ? fileUrl.split("/storage/v1/object/public/delivery-files/")[1]
            : fileUrl.split("/delivery-files/").pop();

          if (!filePath) continue;

          const { data: fileData, error: fileError } = await supabase.storage
            .from("delivery-files")
            .download(filePath);

          if (fileError || !fileData) {
            console.error(`Failed to download file ${filePath}:`, fileError);
            continue;
          }

          // Get filename from path
          const fileName = filePath.split("/").pop() || "file";

          // Send document via Telegram
          const formData = new FormData();
          formData.append("chat_id", telegramChatId.toString());
          formData.append("document", new File([fileData], fileName));
          formData.append("caption", `📎 Файл из заказа #${orderId.substring(0, 8)}`);

          await fetch(`https://api.telegram.org/bot${telegramBotToken}/sendDocument`, {
            method: "POST",
            body: formData,
          });

          console.log(`[ProcessOrder] Sent file ${fileName} to Telegram chat ${telegramChatId}`);
        }

        console.log(`[ProcessOrder] Telegram delivery completed for chat ${telegramChatId}`);
      } catch (tgError) {
        console.error("[ProcessOrder] Telegram delivery error:", tgError);
      }
    } else {
      console.warn("[ProcessOrder] No Telegram bot token or chat ID, skipping Telegram delivery");
    }

    console.log(`[ProcessOrder] Order ${orderId} completed with ${deliveredItems.length} items, ${fileUrls.length} files`);

    return new Response(
      JSON.stringify({
        success: true,
        orderId,
        itemsDelivered: deliveredItems.length,
        filesDelivered: fileUrls.length,
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
