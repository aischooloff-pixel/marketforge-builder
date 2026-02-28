import { useState, useEffect } from 'react';
import { useTelegram } from '@/contexts/TelegramContext';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ExternalLink, CheckCircle, Loader2 } from 'lucide-react';

interface RequiredChannel {
  id: string;
  channel_id: string;
  channel_name: string;
  channel_url: string;
}

export const ChannelSubscribePopup = () => {
  const { user, webApp } = useTelegram();
  const [open, setOpen] = useState(false);
  const [checking, setChecking] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [channels, setChannels] = useState<RequiredChannel[]>([]);
  const [notSubscribedIds, setNotSubscribedIds] = useState<string[]>([]);

  useEffect(() => {
    if (!user) return;
    loadChannelsAndCheck();
  }, [user]);

  const loadChannelsAndCheck = async () => {
    const { data } = await supabase
      .from('required_channels')
      .select('*')
      .eq('is_active', true)
      .order('sort_order');

    const activeChannels = data || [];
    setChannels(activeChannels);

    if (activeChannels.length === 0) return;

    // Check subscriptions for all channels
    const notSub = await checkAllSubscriptions(activeChannels);
    if (notSub.length > 0) {
      setNotSubscribedIds(notSub);
      setOpen(true);
    }
  };

  const checkAllSubscriptions = async (channelsList: RequiredChannel[]): Promise<string[]> => {
    if (!user) return channelsList.map(c => c.id);

    const notSub: string[] = [];
    for (const ch of channelsList) {
      try {
        const { data } = await supabase.functions.invoke('telegram-bot-webhook', {
          body: {
            _checkSubscription: true,
            telegram_id: user.telegram_id,
            channel_id: ch.channel_id,
          },
        });
        if (!data?.subscribed) {
          notSub.push(ch.id);
        }
      } catch {
        notSub.push(ch.id);
      }
    }
    return notSub;
  };

  const handleSubscribe = (url: string) => {
    if (webApp) {
      webApp.openTelegramLink(url);
    } else {
      window.open(url, '_blank');
    }
  };

  const handleCheck = async () => {
    setChecking(true);
    try {
      const notSub = await checkAllSubscriptions(channels);
      if (notSub.length === 0) {
        setSubscribed(true);
        setNotSubscribedIds([]);
        setTimeout(() => setOpen(false), 1000);
      } else {
        setNotSubscribedIds(notSub);
      }
    } finally {
      setChecking(false);
    }
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => {
      // Don't allow closing if not subscribed
      if (!v && notSubscribedIds.length > 0 && !subscribed) return;
      setOpen(v);
    }}>
      <DialogContent className="max-w-sm" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="text-center text-lg">📢 Подпишись на наши каналы</DialogTitle>
          <DialogDescription className="text-center">
            Для использования магазина необходимо подписаться на наши каналы.
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
              {channels
                .filter(ch => notSubscribedIds.includes(ch.id))
                .map(ch => (
                  <Button
                    key={ch.id}
                    onClick={() => handleSubscribe(ch.channel_url)}
                    className="w-full gap-2"
                  >
                    <ExternalLink className="h-4 w-4" />
                    {ch.channel_name}
                  </Button>
                ))}
              <Button
                variant="outline"
                onClick={handleCheck}
                disabled={checking}
                className="w-full gap-2"
              >
                {checking ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                Проверить подписку
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
