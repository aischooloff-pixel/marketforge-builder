import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { PxMail, PxShield } from '@/components/PixelIcons';

const CHANNEL_URL = 'https://t.me/TemkaStoreNews';

export const ChannelGate = () => {
  // null = initial check in progress, true = subscribed, false = not subscribed
  const [status, setStatus] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(false);
  const [telegramId, setTelegramId] = useState<number | null>(null);

  const runCheck = useCallback(async (id: number) => {
    setChecking(true);
    try {
      const { data, error } = await supabase.functions.invoke('check-channel-subscription', {
        body: { telegram_id: id },
      });

      if (error) {
        console.error('[ChannelGate] check error:', error);
        setStatus(false);
        return;
      }

      setStatus(data?.subscribed === true);
    } catch (err) {
      console.error('[ChannelGate] check failed:', err);
      setStatus(false);
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user;

    // Вне Telegram не блокируем разработку/preview
    if (!tgUser?.id) {
      setStatus(true);
      return;
    }

    setTelegramId(tgUser.id);
    // Автопроверка 1 раз при запуске
    runCheck(tgUser.id);
  }, [runCheck]);

  const handleSubscribe = () => {
    if (window.Telegram?.WebApp) {
      window.Telegram.WebApp.openTelegramLink(CHANNEL_URL);
    } else {
      window.open(CHANNEL_URL, '_blank');
    }
  };

  const handleManualCheck = async () => {
    if (!telegramId || checking) return;
    await runCheck(telegramId);
  };

  // Подписан — пускаем
  if (status === true) return null;

  // Первичная проверка — не показываем окно (без текста "Проверяю...")
  if (status === null) return null;

  // Не подписан — блокируем
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
            onClick={handleManualCheck}
            variant="outline"
            className="w-full gap-2"
            disabled={checking}
          >
            <PxShield size={14} />
            Проверить подписку
          </Button>
        </div>

        <p className="text-xs text-destructive font-mono">
          ✗ Подписка не обнаружена. Подпишитесь и нажмите «Проверить».
        </p>
      </div>
    </div>
  );
};
