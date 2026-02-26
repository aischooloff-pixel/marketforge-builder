import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
    const { initData, items, total } = body;

    if (!initData) return json({ error: "Missing initData" }, 400);

    const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
    if (!botToken) return json({ error: "Bot token not configured" }, 500);

    const verification = await verifyTelegramInitData(initData, botToken);
    if (!verification.valid || !verification.telegramId) {
      return json({ error: "Unauthorized" }, 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("telegram_id", verification.telegramId)
      .single();

    if (!profile) return json({ error: "User not found" }, 404);

    const cartItems = items || [];
    const cartTotal = total || 0;

    // Корзина пуста — удаляем сессию
    if (cartItems.length === 0) {
      await supabase.from("cart_sessions").delete().eq("user_id", profile.id);
      return json({ success: true, action: "cleared" });
    }

    const { data: existing } = await supabase
      .from("cart_sessions")
      .select("id, items")
      .eq("user_id", profile.id)
      .maybeSingle();

    const cartChanged = JSON.stringify(cartItems) !== JSON.stringify(existing?.items);

    if (existing) {
      await supabase.from("cart_sessions").update({
        items: cartItems,
        total: cartTotal,
        // Если состав корзины изменился — сбрасываем флаг, чтобы напоминание ушло снова
        ...(cartChanged ? { reminder_sent: false, reminder_sent_at: null } : {}),
      }).eq("user_id", profile.id);
    } else {
      await supabase.from("cart_sessions").insert({
        user_id: profile.id,
        items: cartItems,
        total: cartTotal,
        reminder_sent: false,
      });
    }

    return json({ success: true, action: existing ? "updated" : "created" });
  } catch (error) {
    console.error("[sync-cart] Error:", error);
    return json({ error: "Internal server error" }, 500);
  }
});
