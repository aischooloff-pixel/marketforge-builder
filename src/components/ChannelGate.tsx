import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { PxMail, PxShield } from '@/components/PixelIcons';

const CHANNEL_URL = 'https://t.me/TemkaStoreNews';
const CACHE_KEY = 'channel_sub_ok';

export const ChannelGate = () => {
  // null = not yet determined, true = subscribed, false = not subscribed
  const [status, setStatus] = useState<boolean | null>(() => {
    // Instant cache check — no render flash
    if (sessionStorage.getItem(CACHE_KEY) === '1') return true;
    return null;
  });
  const [checking, setChecking] = useState(false);
  const [telegramId, setTelegramId] = useState<number | null>(null);

  useEffect(() => {
    // Already cached as subscribed
    if (status === true) return;

    const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
    if (!tgUser?.id) {
      // Not in Telegram — skip gate
      setStatus(true);
      return;
    }

    setTelegramId(tgUser.id);

    // Auto-check once on mount
    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabase.functions.invoke('check-channel-subscription', {
          body: { telegram_id: tgUser.id },
        });
        if (cancelled) return;
        if (data?.subscribed === true) {
          sessionStorage.setItem(CACHE_KEY, '1');
          setStatus(true);
        } else {
          setStatus(false);
        }
      } catch {
        if (cancelled) return;
        // On error don't block user
        setStatus(true);
      }
    })();

    return () => { cancelled = true; };
  }, []);

  const checkSubscription = useCallback(async () => {
    if (!telegramId || checking) return;
    setChecking(true);
    try {
      const { data } = await supabase.functions.invoke('check-channel-subscription', {
        body: { telegram_id: telegramId },
      });
      if (data?.subscribed === true) {
        sessionStorage.setItem(CACHE_KEY, '1');
        setStatus(true);
      } else {
        setStatus(false);
      }
    } catch {
      // On error don't block
      setStatus(true);
    } finally {
      setChecking(false);
    }
  }, [telegramId, checking]);

  const handleSubscribe = () => {
    if (window.Telegram?.WebApp) {
      window.Telegram.WebApp.openTelegramLink(CHANNEL_URL);
    } else {
      window.open(CHANNEL_URL, '_blank');
    }
  };

  // Don't show anything while checking initially or if subscribed
  if (status === null || status === true) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-background/95 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="win95-window max-w-sm w-full p-6 text-center space-y-5">
        <div className="flex justify-center">
          <div className="p-3 bevel-raised bg-card">
            <PxMail size={32} />
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-lg font-bold">Подписка на канал</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Для доступа к магазину необходимо подписаться на наш новостной канал.
          </p>
        </div>

        <div className="space-y-2">
          <Button onClick={handleSubscribe} className="w-full gap-2">
            <PxMail size={14} />
            Подписаться на канал
          </Button>

          <Button
            onClick={checkSubscription}
            variant="outline"
            className="w-full gap-2"
            disabled={checking}
          >
            <PxShield size={14} />
            {checking ? 'Проверяю...' : 'Проверить подписку'}
          </Button>
        </div>

        {status === false && !checking && (
          <p className="text-xs text-destructive font-mono">
            ✗ Подписка не обнаружена. Подпишитесь и нажмите «Проверить».
          </p>
        )}
      </div>
    </div>
  );
};
