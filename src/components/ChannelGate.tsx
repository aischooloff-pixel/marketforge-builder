import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { PxMail, PxShield } from '@/components/PixelIcons';
import { useTelegram } from '@/contexts/TelegramContext';

const CHANNEL_URL = 'https://t.me/Temka_Store_News';
const CHANNEL_CACHE_VERSION = 'temka_store_news_v2';
const FRONTEND_TIMEOUT_MS = 6000;
const TG_WAIT_TIMEOUT_MS = 15000;
const TG_POLL_INTERVAL_MS = 250;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

const verificationKey = (telegramId: number) => `channel_sub_verified:${CHANNEL_CACHE_VERSION}:${telegramId}`;

const isCacheValid = (telegramId: number): boolean => {
  const raw = localStorage.getItem(verificationKey(telegramId));
  if (!raw) return false;
  const ts = Number(raw);
  if (isNaN(ts)) return false;
  return Date.now() - ts < CACHE_TTL_MS;
};

const setCacheValid = (telegramId: number) => {
  localStorage.setItem(verificationKey(telegramId), String(Date.now()));
};

const clearCache = (telegramId: number) => {
  localStorage.removeItem(verificationKey(telegramId));
};

export const ChannelGate = () => {
  const { user: telegramUser } = useTelegram();
  const [allowed, setAllowed] = useState(false);
  const [checking, setChecking] = useState(false);
  const [telegramId, setTelegramId] = useState<number | null>(null);
  const [errorText, setErrorText] = useState('');
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
      const data = (result as { data?: { subscribed?: boolean; checked_telegram_id?: number }; error?: unknown }).data;
      const error = (result as { data?: { subscribed?: boolean; checked_telegram_id?: number }; error?: unknown }).error;

      if (error) {
        setAllowed(false);
        clearCache(id);
        setErrorText('Не удалось проверить подписку. Нажмите «Проверить подписку».');
        return;
      }

      if (data?.checked_telegram_id && Number(data.checked_telegram_id) !== id) {
        setAllowed(false);
        clearCache(id);
        setErrorText('Ошибка синхронизации Telegram ID. Перезапустите приложение из Telegram.');
        return;
      }

      if (data?.subscribed === true) {
        setCacheValid(id);
        setAllowed(true);
      } else {
        clearCache(id);
        setAllowed(false);
        setErrorText('Подписка не обнаружена. Подпишитесь и нажмите «Проверить подписку».');
      }
    } catch {
      setAllowed(false);
      clearCache(id);
      setErrorText('Проверка заняла слишком много времени. Нажмите «Проверить подписку».');
    } finally {
      checkingRef.current = false;
      setChecking(false);
    }
  }, [invokeCheckWithTimeout]);

  useEffect(() => {
    const startedAt = Date.now();
    let mounted = true;

    const interval = window.setInterval(() => {
      if (!mounted) return;

      const initDataTelegramId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id;
      const contextTelegramId = telegramUser?.telegram_id;
      const resolvedId = Number(initDataTelegramId ?? contextTelegramId ?? 0);

      if (resolvedId > 0) {
        setTelegramId(resolvedId);

        if (isCacheValid(resolvedId)) {
          setAllowed(true);
        } else {
          clearCache(resolvedId);
          setAllowed(false);
        }

        setInitialized(true);
        window.clearInterval(interval);
        return;
      }

      if (Date.now() - startedAt > TG_WAIT_TIMEOUT_MS) {
        const isTelegramRuntime = Boolean(window.Telegram?.WebApp?.initData && window.Telegram.WebApp.initData.length > 0);

        if (isTelegramRuntime) {
          setAllowed(false);
          setErrorText('Не удалось получить Telegram ID. Перезапустите мини-приложение из Telegram.');
        } else {
          // Вне Telegram / initData не пришли
          setAllowed(true);
        }

        setInitialized(true);
        window.clearInterval(interval);
      }
    }, TG_POLL_INTERVAL_MS);

    return () => {
      mounted = false;
      window.clearInterval(interval);
    };
  }, [telegramUser?.telegram_id]);

  const handleSubscribe = () => {
    if (window.Telegram?.WebApp) {
      window.Telegram.WebApp.openTelegramLink(CHANNEL_URL);
    } else {
      window.open(CHANNEL_URL, '_blank');
    }
  };

  const handleManualCheck = async () => {
    const id = telegramId ?? telegramUser?.telegram_id ?? null;
    if (!id) {
      setErrorText('Не удалось получить Telegram ID. Перезапустите приложение из Telegram.');
      return;
    }
    await runCheck(id);
  };

  if (!initialized) return null;
  if (allowed) return null;

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
          {errorText || 'Подпишитесь и нажмите «Проверить подписку».'}
        </p>
      </div>
    </div>
  );
};
