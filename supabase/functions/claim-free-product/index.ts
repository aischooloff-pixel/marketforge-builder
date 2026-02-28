import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { telegram_id, product_id } = await req.json();

    if (!telegram_id || !product_id) {
      return new Response(JSON.stringify({ error: "Missing params" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // 1. Find user profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, telegram_id")
      .eq("telegram_id", telegram_id)
      .single();

    if (!profile) {
      return new Response(JSON.stringify({ error: "user_not_found", message: "Пользователь не найден" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Check if already claimed this product
    const { data: existing } = await supabase
      .from("free_claims")
      .select("id")
      .eq("user_id", profile.id)
      .eq("product_id", product_id)
      .maybeSingle();

    if (existing) {
      return new Response(
        JSON.stringify({ error: "already_claimed", message: "Ты уже забрал этот товар" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Check channel subscription
    const { data: channels } = await supabase
      .from("required_channels")
      .select("channel_id")
      .eq("is_active", true);

    if (channels && channels.length > 0) {
      for (const ch of channels) {
        try {
          const res = await fetch(
            `https://api.telegram.org/bot${botToken}/getChatMember?chat_id=${ch.channel_id}&user_id=${telegram_id}`,
            { signal: AbortSignal.timeout(5000) }
          );
          const data = await res.json();
          if (!data.ok || !["member", "administrator", "creator"].includes(data.result?.status)) {
            return new Response(
              JSON.stringify({ error: "not_subscribed", message: "Подпишись на канал проекта" }),
              { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        } catch {
          return new Response(
            JSON.stringify({ error: "check_failed", message: "Не удалось проверить подписку, попробуй позже" }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
    }

    // 4. Claim product item
    const { data: items, error: claimErr } = await supabase.rpc("claim_product_item", {
      p_product_id: product_id,
      p_user_id: profile.id,
      p_order_id: "00000000-0000-0000-0000-000000000000",
    });

    if (claimErr || !items || items.length === 0) {
      return new Response(
        JSON.stringify({ error: "out_of_stock", message: "Товар закончился" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const claimedItem = items[0];

    // 5. Record the claim
    await supabase.from("free_claims").insert({
      user_id: profile.id,
      product_id,
      content: claimedItem.content,
    });

    // 6. Get product info for Telegram message
    const { data: product } = await supabase
      .from("products")
      .select("name")
      .eq("id", product_id)
      .single();

    // 7. Send via Telegram
    const chatId = profile.telegram_id;
    const fileUrls: string[] = [];
    if (claimedItem.file_url) fileUrls.push(claimedItem.file_url);

    const textMessage = `🎁 Бесплатный товар получен!\n\n📦 ${product?.name || "Товар"}:\n${claimedItem.content}\n\n🛍 Спасибо! Загляни в каталог за другими товарами.`;

    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: textMessage.substring(0, 4096),
        reply_markup: {
          inline_keyboard: [
            [{ text: "🛍 Открыть магазин", url: "https://t.me/Temka_Store_Bot/app" }],
          ],
        },
      }),
    });

    // Send files if any
    for (const fileUrl of fileUrls) {
      const filePath = fileUrl.includes("/storage/v1/object/public/")
        ? fileUrl.split("/storage/v1/object/public/delivery-files/")[1]
        : fileUrl.split("/delivery-files/").pop();

      if (!filePath) continue;

      const { data: fileData, error: fileError } = await supabase.storage
        .from("delivery-files")
        .download(filePath);

      if (fileError || !fileData) continue;

      const fileName = filePath.split("/").pop() || "file";
      const formData = new FormData();
      formData.append("chat_id", chatId.toString());
      formData.append("document", new File([fileData], fileName));
      formData.append("caption", `📎 Бесплатный товар: ${product?.name || "Файл"}`);

      await fetch(`https://api.telegram.org/bot${botToken}/sendDocument`, {
        method: "POST",
        body: formData,
      });
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("claim-free-product error:", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
