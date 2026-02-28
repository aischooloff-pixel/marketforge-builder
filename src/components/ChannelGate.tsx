import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { PxMail, PxShield } from '@/components/PixelIcons';

const CHANNEL_URL = 'https://t.me/TemkaStoreNews';

export const ChannelGate = () => {
  const [isSubscribed, setIsSubscribed] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(false);
  const [telegramId, setTelegramId] = useState<number | null>(null);

  // Get telegram_id directly from WebApp — no waiting for profile
  useEffect(() => {
    const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
    if (tgUser?.id) {
      setTelegramId(tgUser.id);
    } else {
      // Not in Telegram (dev mode) — skip gate
      setIsSubscribed(true);
    }
  }, []);

  const checkSubscription = useCallback(async () => {
    if (!telegramId) return;
    setChecking(true);
    try {
      const { data, error } = await supabase.functions.invoke('check-channel-subscription', {
        body: { telegram_id: telegramId },
      });
      if (error) {
        console.error('[ChannelGate] Error:', error);
        return;
      }
      setIsSubscribed(data?.subscribed === true);
    } catch (err) {
      console.error('[ChannelGate] Check failed:', err);
    } finally {
      setChecking(false);
    }
  }, [telegramId]);

  // Auto-check on mount when telegramId is available
  useEffect(() => {
    if (telegramId) {
      checkSubscription();
    }
  }, [telegramId, checkSubscription]);

  const handleSubscribe = () => {
    if (window.Telegram?.WebApp) {
      window.Telegram.WebApp.openTelegramLink(CHANNEL_URL);
    } else {
      window.open(CHANNEL_URL, '_blank');
    }
  };

  // Don't render if subscribed or not in Telegram
  if (isSubscribed === true) return null;
  // Show nothing until initial check completes
  if (isSubscribed === null && !checking) return null;

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

        {isSubscribed === false && !checking && (
          <p className="text-xs text-destructive font-mono">
            ✗ Подписка не обнаружена. Подпишитесь и нажмите «Проверить».
          </p>
        )}
      </div>
    </div>
  );
};
