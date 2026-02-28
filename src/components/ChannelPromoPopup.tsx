import { useState, useEffect } from 'react';
import { useTelegram } from '@/contexts/TelegramContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ExternalLink, X } from 'lucide-react';

const STORAGE_KEY = 'temka_session_count';
const SUBSCRIBED_KEY = 'temka_promo_subscribed';
const CHANNEL_ID = '@TemkaStoreNews';
const CHANNEL_URL = 'https://t.me/TemkaStoreNews';

export const ChannelPromoPopup = () => {
  const { user, webApp } = useTelegram();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!user) return;

    // Already dismissed permanently
    if (localStorage.getItem(SUBSCRIBED_KEY) === '1') return;

    const count = parseInt(localStorage.getItem(STORAGE_KEY) || '0', 10) + 1;
    localStorage.setItem(STORAGE_KEY, String(count));

    // Show on 2nd launch, then every 5th (7, 12, 17...)
    const shouldShow = count === 2 || (count > 2 && (count - 2) % 5 === 0);
    if (!shouldShow) return;

    setTimeout(() => setOpen(true), 1500);
  }, [user]);

  const handleSubscribe = () => {
    if (webApp) {
      webApp.openTelegramLink(CHANNEL_URL);
    } else {
      window.open(CHANNEL_URL, '_blank');
    }
    localStorage.setItem(SUBSCRIBED_KEY, '1');
    setOpen(false);
  };

  if (!user) return null;

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
