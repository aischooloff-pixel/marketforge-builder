import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CRYPTOBOT_API_URL = "https://pay.crypt.bot/api";

// Cache rate for 5 minutes
let cachedRate: { rate: number; timestamp: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Return cached rate if fresh
    if (cachedRate && Date.now() - cachedRate.timestamp < CACHE_TTL) {
      return new Response(
        JSON.stringify({ success: true, rate: cachedRate.rate }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const cryptoBotToken = Deno.env.get("CRYPTOBOT_API_TOKEN");
    if (!cryptoBotToken) {
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const response = await fetch(`${CRYPTOBOT_API_URL}/getExchangeRates`, {
      method: "GET",
      headers: {
        "Crypto-Pay-API-Token": cryptoBotToken,
      },
    });

    const data = await response.json();

    if (!data.ok) {
      console.error("CryptoBot getExchangeRates error:", data);
      return new Response(
        JSON.stringify({ error: "Failed to fetch exchange rates" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Find USDT -> RUB rate
    const usdtRub = data.result.find(
      (r: any) => r.source === "USDT" && r.target === "RUB" && r.is_valid
    );

    if (!usdtRub) {
      // Fallback: try USD -> RUB
      const usdRub = data.result.find(
        (r: any) => r.source === "USD" && r.target === "RUB" && r.is_valid
      );
      const rate = usdRub ? parseFloat(usdRub.rate) : 90;
      cachedRate = { rate, timestamp: Date.now() };
      return new Response(
        JSON.stringify({ success: true, rate }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const rate = parseFloat(usdtRub.rate);
    cachedRate = { rate, timestamp: Date.now() };

    return new Response(
      JSON.stringify({ success: true, rate }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Exchange rate error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
