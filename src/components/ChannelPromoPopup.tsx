import { useState, useEffect } from 'react';
import { useTelegram } from '@/contexts/TelegramContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ExternalLink, X } from 'lucide-react';

const STORAGE_KEY = 'temka_promo_v2_session_count';
const SUBSCRIBED_KEY = 'temka_promo_v2_subscribed';
const SESSION_MARK_KEY = 'temka_promo_v2_launch_mark';
const CHANNEL_URL = 'https://t.me/TemkaStoreNews';

export const ChannelPromoPopup = () => {
  const { user, webApp } = useTelegram();
  const [open, setOpen] = useState(false);

  const telegramId = webApp?.initDataUnsafe?.user?.id ?? user?.telegram_id;

  useEffect(() => {
    if (!telegramId) return;

    if (localStorage.getItem(SUBSCRIBED_KEY) === '1') return;

    const launchMark = `${SESSION_MARK_KEY}:${telegramId}`;
    if (sessionStorage.getItem(launchMark) === '1') return;
    sessionStorage.setItem(launchMark, '1');

    const count = parseInt(localStorage.getItem(STORAGE_KEY) || '0', 10) + 1;
    localStorage.setItem(STORAGE_KEY, String(count));

    const shouldShow = count === 2 || (count > 2 && (count - 2) % 5 === 0);
    if (!shouldShow) return;

    const timer = setTimeout(() => setOpen(true), 1500);
    return () => clearTimeout(timer);
  }, [telegramId]);

  const handleSubscribe = () => {
    if (webApp) {
      webApp.openTelegramLink(CHANNEL_URL);
    } else {
      window.open(CHANNEL_URL, '_blank');
    }
    localStorage.setItem(SUBSCRIBED_KEY, '1');
    setOpen(false);
  };

  if (!telegramId) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-center text-lg flex items-center justify-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-destructive animate-pulse" />
            📢 LIVE
          </DialogTitle>
          <DialogDescription className="text-center">
            Подпишись на наш канал, чтобы не пропустить новинки, акции и промокоды!
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 mt-2">
          <Button onClick={handleSubscribe} className="w-full gap-2">
            <ExternalLink className="h-4 w-4" />
            Подписаться
          </Button>
          <Button variant="ghost" onClick={() => setOpen(false)} className="w-full gap-2 text-muted-foreground">
            <X className="h-4 w-4" />
            Позже
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
