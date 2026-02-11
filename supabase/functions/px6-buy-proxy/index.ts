import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PX6_BASE = "https://px6.link/api";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("PX6_API_KEY");
    if (!apiKey) {
      throw new Error("PX6_API_KEY is not configured");
    }

    const { action, country, period, count, version, type } = await req.json();
    // version: 6=IPv6, 4=IPv4, 3=IPv4 Shared
    const proxyVersion = version || 3;
    const proxyType = type === "socks" ? "socks" : "http";

    // Action: getcountry — list available countries
    if (action === "getcountry") {
      const res = await fetch(`${PX6_BASE}/${apiKey}/getcountry?version=${proxyVersion}`);
      const data = await res.json();
      if (data.status !== "yes") {
        throw new Error(`px6 getcountry failed: ${JSON.stringify(data)}`);
      }
      return new Response(
        JSON.stringify({ countries: data.list, balance: data.balance, currency: data.currency }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Action: availability — get countries with stock counts
    if (action === "availability") {
      const countriesRes = await fetch(`${PX6_BASE}/${apiKey}/getcountry?version=${proxyVersion}`);
      const countriesData = await countriesRes.json();
      if (countriesData.status !== "yes") {
        throw new Error(`px6 getcountry failed: ${JSON.stringify(countriesData)}`);
      }

      const countryList: string[] = countriesData.list || [];
      const availability: Record<string, number> = {};

      // Fetch count for each country in parallel
      const countPromises = countryList.map(async (c: string) => {
        try {
          const r = await fetch(`${PX6_BASE}/${apiKey}/getcount?country=${c}&version=${proxyVersion}`);
          const d = await r.json();
          availability[c] = d.status === "yes" ? parseInt(d.count) || 0 : 0;
        } catch {
          availability[c] = 0;
        }
      });
      await Promise.all(countPromises);

      return new Response(
        JSON.stringify({ countries: countryList, availability, balance: countriesData.balance }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Action: getcount — check available proxy count for a country
    if (action === "getcount") {
      if (!country) throw new Error("country is required");
      const res = await fetch(`${PX6_BASE}/${apiKey}/getcount?country=${country}&version=${proxyVersion}`);
      const data = await res.json();
      if (data.status !== "yes") {
        throw new Error(`px6 getcount failed: ${JSON.stringify(data)}`);
      }
      return new Response(
        JSON.stringify({ count: data.count, balance: data.balance }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Action: buy — purchase proxy
    if (action === "buy") {
      if (!country) throw new Error("country is required");
      const proxyCount = count || 1;
      const proxyPeriod = period || 30; // days

      console.log(`[px6] Buying ${proxyCount} v${proxyVersion} proxy for ${country}, period: ${proxyPeriod} days`);

      const res = await fetch(
        `${PX6_BASE}/${apiKey}/buy?count=${proxyCount}&period=${proxyPeriod}&country=${country}&version=${proxyVersion}&type=${proxyType}`
      );
      const data = await res.json();

      if (data.status !== "yes") {
        console.error("[px6] Buy failed:", data);
        throw new Error(`px6 buy failed: ${data.error_id || data.error || JSON.stringify(data)}`);
      }

      // data.list contains the purchased proxies
      // Each proxy: { id, ip, host, port, user, pass, type, country, date, date_end, unixtime, unixtime_end }
      const proxies = Object.values(data.list || {}) as Array<{
        id: string;
        ip: string;
        host: string;
        port: string;
        user: string;
        pass: string;
        type: string;
        country: string;
        date: string;
        date_end: string;
      }>;

      console.log(`[px6] Purchased ${proxies.length} proxies successfully`);

      // Format proxy details for delivery
      const versionLabel = proxyVersion === 6 ? "IPv6" : proxyVersion === 4 ? "IPv4" : "IPv4 Shared";
      const proxyDetails = proxies.map((p, i) => {
        return [
          `🌐 Прокси #${i + 1}`,
          `IP: ${p.host}:${p.port}`,
          `Логин: ${p.user}`,
          `Пароль: ${p.pass}`,
          `Тип: ${versionLabel} (${p.type})`,
          `Страна: ${(p.country || country || "—").toUpperCase()}`,
          `Активен до: ${p.date_end}`,
        ].join("\n");
      });

      return new Response(
        JSON.stringify({
          success: true,
          proxies,
          formatted: proxyDetails.join("\n\n"),
          balance: data.balance,
          currency: data.currency,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Action: getproxy — list user's proxies
    if (action === "getproxy") {
      const res = await fetch(`${PX6_BASE}/${apiKey}/getproxy`);
      const data = await res.json();
      return new Response(
        JSON.stringify(data),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Unknown action. Use: getcountry, getcount, buy, getproxy" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[px6] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
