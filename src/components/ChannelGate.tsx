import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { PxMail, PxShield } from '@/components/PixelIcons';

const CHANNEL_URL = 'https://t.me/TemkaStoreNews';
const CACHE_KEY = 'channel_sub_ok';

export const ChannelGate = () => {
  const [isSubscribed, setIsSubscribed] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(false);
  const [telegramId, setTelegramId] = useState<number | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
    if (!tgUser?.id) {
      // Not in Telegram — skip gate
      setIsSubscribed(true);
      return;
    }

    // Check cache first
    if (sessionStorage.getItem(CACHE_KEY) === '1') {
      setIsSubscribed(true);
      return;
    }

    setTelegramId(tgUser.id);
    // Show the gate immediately, no auto-check
    setIsSubscribed(false);
  }, []);

  const checkSubscription = useCallback(async () => {
    if (!telegramId) return;
    setChecking(true);
    setError(false);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('check-channel-subscription', {
        body: { telegram_id: telegramId },
      });

      if (fnError) {
        console.error('[ChannelGate] Error:', fnError);
        setError(true);
        return;
      }

      if (data?.subscribed === true) {
        sessionStorage.setItem(CACHE_KEY, '1');
        setIsSubscribed(true);
      } else {
        setError(true);
      }
    } catch (err) {
      console.error('[ChannelGate] Check failed:', err);
      setError(true);
    } finally {
      setChecking(false);
    }
  }, [telegramId]);

  const handleSubscribe = () => {
    if (window.Telegram?.WebApp) {
      window.Telegram.WebApp.openTelegramLink(CHANNEL_URL);
    } else {
      window.open(CHANNEL_URL, '_blank');
    }
  };

  if (isSubscribed === true || isSubscribed === null) return null;

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
            Там публикуются важные обновления, акции и новые поступления.
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

        {error && !checking && (
          <p className="text-xs text-destructive font-mono">
            ✗ Подписка не обнаружена. Подпишитесь и нажмите «Проверить».
          </p>
        )}
      </div>
    </div>
  );
};
