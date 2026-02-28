import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

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

    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/getChatMember?chat_id=${channelUsername}&user_id=${telegram_id}`
    );

    const data = await response.json();

    if (!data.ok) {
      console.error('Telegram API error:', data);
      // If bot is not admin in channel or user never interacted, treat as not subscribed
      return new Response(
        JSON.stringify({ subscribed: false, status: 'unknown' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const memberStatus = data.result?.status;
    // member, administrator, creator = subscribed; left, kicked, restricted = not subscribed
    const subscribed = ['member', 'administrator', 'creator'].includes(memberStatus);

    return new Response(
      JSON.stringify({ subscribed, status: memberStatus }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error checking subscription:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
