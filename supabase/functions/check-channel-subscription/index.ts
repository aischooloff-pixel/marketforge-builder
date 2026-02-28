import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const TELEGRAM_TIMEOUT_MS = 3500;

async function checkWithBotToken(botToken: string, channelUsername: string, telegramId: number | string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort('telegram_timeout'), TELEGRAM_TIMEOUT_MS);

  try {
    const params = new URLSearchParams({
      chat_id: channelUsername,
      user_id: String(telegramId),
    });

    const response = await fetch(`https://api.telegram.org/bot${botToken}/getChatMember?${params.toString()}`, {
      method: 'GET',
      signal: controller.signal,
    });

    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { telegram_id } = await req.json();

    if (!telegram_id) {
      return new Response(
        JSON.stringify({ error: 'telegram_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const primaryBotToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
    const backupBotToken = Deno.env.get('TELEGRAM_BOT_TOKEN_BACKUP');
    const botTokens = [primaryBotToken, backupBotToken].filter((v): v is string => Boolean(v));

    if (botTokens.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Bot token not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const channelUsername = '@TemkaStoreNews';

    for (const token of botTokens) {
      try {
        const data = await checkWithBotToken(token, channelUsername, telegram_id);

        if (data?.ok) {
          const memberStatus = data.result?.status;
          const subscribed = ['member', 'administrator', 'creator'].includes(memberStatus);

          return new Response(
            JSON.stringify({ subscribed, status: memberStatus }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const errorCode = data?.error_code;
        // Рейтлимит/временные ошибки -> пробуем резервный токен
        if (errorCode === 429 || errorCode >= 500) {
          continue;
        }
      } catch {
        // таймаут/сеть у текущего бота -> пробуем следующий
        continue;
      }
    }

    return new Response(
      JSON.stringify({ subscribed: false, status: 'unknown' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch {
    return new Response(
      JSON.stringify({ error: 'internal_error', subscribed: false }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
