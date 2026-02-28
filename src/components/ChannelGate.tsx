import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { PxMail, PxShield } from '@/components/PixelIcons';

const CHANNEL_URL = 'https://t.me/TemkaStoreNews';
const FRONTEND_TIMEOUT_MS = 6000;

export const ChannelGate = () => {
  const [allowed, setAllowed] = useState(false);
  const [checking, setChecking] = useState(false);
  const [telegramId, setTelegramId] = useState<number | null>(null);
  const [errorText, setErrorText] = useState<string>('');
  const [initialized, setInitialized] = useState(false);
  const checkingRef = useRef(false);

  const invokeCheckWithTimeout = useCallback(async (id: number) => {
    return await Promise.race([
      supabase.functions.invoke('check-channel-subscription', {
        body: { telegram_id: id },
      }),
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('frontend_timeout')), FRONTEND_TIMEOUT_MS);
      }),
    ]);
  }, []);

  const runCheck = useCallback(async (id: number) => {
    if (checkingRef.current) return;

    checkingRef.current = true;
    setChecking(true);
    setErrorText('');

    try {
      const result = await invokeCheckWithTimeout(id);
      const data = (result as { data?: { subscribed?: boolean }; error?: unknown }).data;
      const error = (result as { data?: { subscribed?: boolean }; error?: unknown }).error;

      if (error) {
        setAllowed(false);
        setErrorText('Не удалось проверить подписку. Нажмите «Проверить подписку».');
        return;
      }

      if (data?.subscribed === true) {
        setAllowed(true);
      } else {
        setAllowed(false);
        setErrorText('Подписка не обнаружена. Подпишитесь и нажмите «Проверить подписку».');
      }
    } catch {
      setAllowed(false);
      setErrorText('Проверка заняла слишком много времени. Нажмите «Проверить подписку».');
    } finally {
      checkingRef.current = false;
      setChecking(false);
      setInitialized(true);
    }
  }, [invokeCheckWithTimeout]);

  useEffect(() => {
    const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user;

    if (!tgUser?.id) {
      setAllowed(true);
      setInitialized(true);
      return;
    }

    setTelegramId(tgUser.id);
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
    if (!telegramId) return;
    await runCheck(telegramId);
  };

  if (allowed) return null;
  if (!initialized) return null;

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
          {errorText || 'Подписка не обнаружена. Подпишитесь и нажмите «Проверить подписку».'}
        </p>
      </div>
    </div>
  );
};
