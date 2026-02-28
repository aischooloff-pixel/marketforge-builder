import { useState, useEffect } from 'react';
import { useTelegram } from '@/contexts/TelegramContext';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ExternalLink, CheckCircle, Loader2 } from 'lucide-react';

const CHANNEL_URL = 'https://t.me/TemkaStoreNews';
const CHANNEL_ID = '@TemkaStoreNews';
const STORAGE_KEY = 'app_launch_count';

export const ChannelSubscribePopup = () => {
  const { user, webApp } = useTelegram();
  const [open, setOpen] = useState(false);
  const [checking, setChecking] = useState(false);
  const [subscribed, setSubscribed] = useState(false);

  useEffect(() => {
    if (!user) return;

    const count = parseInt(localStorage.getItem(STORAGE_KEY) || '0', 10) + 1;
    localStorage.setItem(STORAGE_KEY, String(count));

    // Show on 2nd launch, then every 5th (7, 12, 17...)
    const shouldShow = count === 2 || (count > 2 && (count - 2) % 5 === 0);
    if (!shouldShow) return;

    // Check subscription before showing
    checkSubscription().then((isSub) => {
      if (!isSub) setOpen(true);
    });
  }, [user]);

  const checkSubscription = async (): Promise<boolean> => {
    if (!user) return false;
    setChecking(true);
    try {
      const { data } = await supabase.functions.invoke('telegram-bot-webhook', {
        body: {
          _checkSubscription: true,
          telegram_id: user.telegram_id,
          channel_id: CHANNEL_ID,
        },
      });
      const result = !!data?.subscribed;
      setSubscribed(result);
      return result;
    } catch {
      return false;
    } finally {
      setChecking(false);
    }
  };

  const handleSubscribe = () => {
    if (webApp) {
      webApp.openTelegramLink(CHANNEL_URL);
    } else {
      window.open(CHANNEL_URL, '_blank');
    }
  };

  const handleCheck = async () => {
    const isSub = await checkSubscription();
    if (isSub) {
      setTimeout(() => setOpen(false), 1000);
    }
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-center text-lg">📢 Подпишись на наш канал</DialogTitle>
          <DialogDescription className="text-center">
            Будь в курсе новинок, акций и скидок! Подпишись на наш канал.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col gap-3 mt-2">
          {subscribed ? (
            <div className="flex items-center justify-center gap-2 text-green-500 py-3">
              <CheckCircle className="h-5 w-5" />
              <span className="font-medium">Вы подписаны! Спасибо ❤️</span>
            </div>
          ) : (
            <>
              <Button onClick={handleSubscribe} className="w-full gap-2">
                <ExternalLink className="h-4 w-4" />
                Подписаться на канал
              </Button>
              <Button 
                variant="outline" 
                onClick={handleCheck} 
                disabled={checking}
                className="w-full gap-2"
              >
                {checking ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                Проверить подписку
              </Button>
              <Button variant="ghost" onClick={() => setOpen(false)} className="w-full text-muted-foreground text-xs">
                Позже
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
