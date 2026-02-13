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
    let hasStarsItems = false;
    for (const item of order.order_items) {
      const quantity = item.quantity || 1;

      // Check if this is an API-based product (e.g., px6 proxy)
      const { data: productData } = await supabase
        .from("products")
        .select("tags")
        .eq("id", item.product_id)
        .single();

      const tags: string[] = productData?.tags || [];
      const isApiPx6 = tags.includes("api:px6");
      const isApiStars = tags.includes("api:stars");

      // Telegram Stars: manual fulfillment — add to delivered items but don't auto-complete
      if (isApiStars) {
        const options = item.options as { country?: string; services?: string[] } | null;
        const targetUsername = options?.country || "unknown";
        const starCount = options?.services?.[0] || "0";

        console.log(`[ProcessOrder] Stars order: ${starCount} stars for @${targetUsername}`);
        deliveredItems.push(`⭐ ${item.product_name}:\nЗаказ на ${starCount} звёзд для @${targetUsername} взят в обработку. Ожидайте пополнения.`);
        hasStarsItems = true;
        continue;
      }

      if (isApiPx6) {
        // Always buy via px6 API — even if product_items exist, API products are fulfilled via API
        const options = item.options as { country?: string; period?: number; protocol?: string } | null;
        const country = options?.country || "ru";
        const period = options?.period || 30;
        const protocol = options?.protocol || "http";
        const proxyVersion = tags.includes("api:px6:v3") ? 3 : tags.includes("api:px6:v4") ? 4 : 6;

        console.log(`[ProcessOrder] API product (px6): buying ${quantity} v${proxyVersion} proxy for ${country}, period ${period}, protocol ${protocol}`);

        try {
          const px6Url = `${supabaseUrl}/functions/v1/px6-buy-proxy`;
          const px6Res = await fetch(px6Url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${supabaseServiceKey}`,
            },
            body: JSON.stringify({
              action: "buy",
              country,
              period,
              count: quantity,
              version: proxyVersion,
              type: protocol,
            }),
          });

          const px6Data = await px6Res.json();

          if (px6Data.success && px6Data.formatted) {
            deliveredItems.push(`📦 ${item.product_name}:\n${px6Data.formatted}`);
            console.log(`[ProcessOrder] px6 proxy purchased successfully`);
          } else {
            console.error("[ProcessOrder] px6 buy failed:", px6Data);
            deliveredItems.push(`📦 ${item.product_name}:\n❌ Произошла ошибка при покупке прокси. Пожалуйста, напишите в поддержку магазина для решения проблемы.`);
          }
        } catch (px6Error) {
          console.error("[ProcessOrder] px6 API error:", px6Error);
          deliveredItems.push(`📦 ${item.product_name}:\n❌ Произошла ошибка при покупке прокси. Пожалуйста, напишите в поддержку магазина для решения проблемы.`);
        }
        continue;
      }

      // Standard product: claim product_items
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
    // If order has Stars items, keep as "paid" (admin completes Stars manually)
    // If order has ONLY regular items (no Stars), mark as "completed"
    const deliveredContent = deliveredItems.join("\n\n---\n\n");
    const finalStatus = hasStarsItems ? "paid" : "completed";
    
    const { error: updateOrderError } = await supabase
      .from("orders")
      .update({
        status: finalStatus,
        ...(finalStatus === "completed" ? { completed_at: new Date().toISOString() } : {}),
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
          const statusEmoji = hasStarsItems ? '⏳' : '✅';
          const statusText = hasStarsItems
            ? `${statusEmoji} Заказ #${orderId.substring(0, 8)} оплачен!\n\nВаши товары:\n\n${deliveredContent}`
            : `${statusEmoji} Заказ #${orderId.substring(0, 8)} оплачен!\n\nВаши товары:\n\n${deliveredContent}\n\n🙏 Спасибо за покупку! Будем рады видеть вас снова.\n⭐ Оставьте, пожалуйста, отзыв — нам важно ваше мнение!`;
          const textMessage = statusText;
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
