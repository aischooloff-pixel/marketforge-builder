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
      .select("id")
      .eq("telegram_id", telegram_id)
      .single();

    if (!profile) {
      return new Response(JSON.stringify({ error: "User not found" }), {
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
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
          if (
            !data.ok ||
            !["member", "administrator", "creator"].includes(data.result?.status)
          ) {
            return new Response(
              JSON.stringify({ error: "not_subscribed", message: "Подпишись на канал" }),
              { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        } catch {
          return new Response(
            JSON.stringify({ error: "check_failed", message: "Не удалось проверить подписку" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
    }

    // 4. Claim a product_item
    const { data: items, error: claimErr } = await supabase.rpc("claim_product_item", {
      p_product_id: product_id,
      p_user_id: profile.id,
      p_order_id: "00000000-0000-0000-0000-000000000000",
    });

    if (claimErr || !items || items.length === 0) {
      return new Response(
        JSON.stringify({ error: "out_of_stock", message: "Товар закончился" }),
        { status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const claimedItem = items[0];

    // 5. Record the claim
    await supabase.from("free_claims").insert({
      user_id: profile.id,
      product_id,
      content: claimedItem.content,
    });

    return new Response(
      JSON.stringify({
        success: true,
        content: claimedItem.content,
        file_url: claimedItem.file_url,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
