import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const cryptoBotToken = Deno.env.get("CRYPTOBOT_API_TOKEN");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    if (!cryptoBotToken || !supabaseUrl) {
      return new Response(JSON.stringify({ error: "Missing config" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const webhookUrl = `${supabaseUrl}/functions/v1/cryptobot-webhook`;

    // First, delete existing webhook
    await fetch("https://pay.crypt.bot/api/deleteWebhook", {
      method: "POST",
      headers: {
        "Crypto-Pay-API-Token": cryptoBotToken,
        "Content-Type": "application/json",
      },
    });

    // Set new webhook URL
    const response = await fetch("https://pay.crypt.bot/api/setWebhook", {
      method: "POST",
      headers: {
        "Crypto-Pay-API-Token": cryptoBotToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url: webhookUrl }),
    });

    const result = await response.json();
    console.log("setWebhook result:", JSON.stringify(result));

    return new Response(JSON.stringify({ webhookUrl, result }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
