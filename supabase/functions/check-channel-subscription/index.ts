import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const TELEGRAM_TIMEOUT_MS = 4500;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { telegram_id } = await req.json();

    if (!telegram_id) {
      return new Response(
        JSON.stringify({ error: 'telegram_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
    if (!botToken) {
      return new Response(
        JSON.stringify({ error: 'Bot token not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const channelUsername = '@TemkaStoreNews';

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort('telegram_timeout'), TELEGRAM_TIMEOUT_MS);

    let response: Response;
    try {
      const params = new URLSearchParams({
        chat_id: channelUsername,
        user_id: String(telegram_id),
      });

      response = await fetch(`https://api.telegram.org/bot${botToken}/getChatMember?${params.toString()}`, {
        method: 'GET',
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }

    const data = await response.json();

    if (!data.ok) {
      console.error('Telegram API error:', data);
      return new Response(
        JSON.stringify({ subscribed: false, status: 'unknown' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const memberStatus = data.result?.status;
    const subscribed = ['member', 'administrator', 'creator'].includes(memberStatus);

    return new Response(
      JSON.stringify({ subscribed, status: memberStatus }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error checking subscription:', error);

    const message = error instanceof Error ? error.message : String(error);
    const isTimeout = message.includes('telegram_timeout') || message.includes('aborted');

    return new Response(
      JSON.stringify({ error: isTimeout ? 'telegram_timeout' : 'internal_error', subscribed: false }),
      { status: isTimeout ? 504 : 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
