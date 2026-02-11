import { useState, useEffect, useCallback } from 'react';
import { useMyVirtualNumbers, useCheckSmsStatus, useSetActivationStatus, TIGER_SERVICES } from '@/hooks/useTigerSms';
import { useTelegram } from '@/contexts/TelegramContext';
import { ServiceLogo } from '@/components/ServiceLogo';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Phone, MessageSquare, Copy, Check, RefreshCw, X, Loader2, Star } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const getServiceInfo = (code: string) =>
  TIGER_SERVICES.find(s => s.code === code) || { code, name: code, icon: '📱' };

const statusLabels: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  waiting: { label: 'Ожидание SMS', variant: 'outline' },
  ready: { label: 'Готов к приёму', variant: 'secondary' },
  code_received: { label: 'Код получен', variant: 'default' },
  retry: { label: 'Ожидание повтора', variant: 'secondary' },
  completed: { label: 'Завершено', variant: 'default' },
  cancelled: { label: 'Отменено', variant: 'destructive' },
};

const CANCEL_TIMER_MS = 3 * 60 * 1000; // 3 minutes

const InlineReviewForm = ({ numberId }: { numberId: string }) => {
  const { user } = useTelegram();
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (submitted) {
    return <p className="text-xs text-muted-foreground mt-2">✅ Спасибо за отзыв!</p>;
  }

  const handleSubmit = async () => {
    if (!user) return;
    if (!text.trim() || text.trim().length < 5) {
      toast.error('Напишите хотя бы 5 символов');
      return;
    }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('user-data', {
        body: {
          initData: window.Telegram?.WebApp?.initData,
          path: '/reviews',
          method: 'POST',
          text: text.trim().slice(0, 500),
          rating,
        },
      });
      if (error || data?.error) throw new Error(data?.error || 'Failed');
      setSubmitted(true);
      toast.success('Отзыв отправлен на модерацию');
    } catch {
      toast.error('Не удалось отправить отзыв');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mt-3 pt-3 border-t space-y-2">
      <p className="text-xs font-medium text-muted-foreground">Оставить отзыв</p>
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => setRating(star)}
            onMouseEnter={() => setHoverRating(star)}
            onMouseLeave={() => setHoverRating(0)}
            className="p-0.5"
          >
            <Star
              className={`h-5 w-5 transition-colors ${
                star <= (hoverRating || rating)
                  ? 'fill-primary text-primary'
                  : 'text-muted-foreground/30'
              }`}
            />
          </button>
        ))}
      </div>
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Поделитесь впечатлениями..."
        maxLength={500}
        className="resize-none text-xs"
        rows={2}
      />
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{text.length}/500</span>
        <Button size="sm" onClick={handleSubmit} disabled={submitting || !text.trim()} className="h-7 text-xs">
          {submitting ? 'Отправка...' : 'Отправить'}
        </Button>
      </div>
    </div>
  );
};

const CancelTimer = ({ createdAt, onExpired }: { createdAt: string; onExpired: () => void }) => {
  const [remaining, setRemaining] = useState(() => {
    const diff = CANCEL_TIMER_MS - (Date.now() - new Date(createdAt).getTime());
    return Math.max(0, diff);
  });

  useEffect(() => {
    if (remaining <= 0) {
      onExpired();
      return;
    }
    const interval = setInterval(() => {
      const diff = CANCEL_TIMER_MS - (Date.now() - new Date(createdAt).getTime());
      if (diff <= 0) {
        setRemaining(0);
        onExpired();
        clearInterval(interval);
      } else {
        setRemaining(diff);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [createdAt]);

  if (remaining <= 0) return null;

  const mins = Math.floor(remaining / 60000);
  const secs = Math.floor((remaining % 60000) / 1000);
  return (
    <span className="text-xs text-muted-foreground tabular-nums">
      {mins}:{secs.toString().padStart(2, '0')}
    </span>
  );
};

export const VirtualNumbersTab = () => {
  const queryClient = useQueryClient();
  const { user } = useTelegram();
  const { data: numbers, isLoading, refetch } = useMyVirtualNumbers(user?.id);
  const checkStatus = useCheckSmsStatus();
  const setStatus = useSetActivationStatus();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [pollingIds, setPollingIds] = useState<Set<string>>(new Set());
  const [expiredIds, setExpiredIds] = useState<Set<string>>(new Set());

  // Auto-poll for waiting numbers
  useEffect(() => {
    if (!numbers) return;
    const waitingNums = numbers.filter(n => n.status === 'waiting' || n.status === 'ready' || n.status === 'retry');
    if (waitingNums.length === 0) return;

    const interval = setInterval(() => {
      waitingNums.forEach(n => {
        checkStatus.mutate(n.activation_id, {
          onSuccess: (result) => {
            if (result.status === 'code_received') {
              refetch();
              toast.success(`SMS код получен для ${n.phone_number}!`);
            } else if (result.status === 'cancelled') {
              refetch();
              queryClient.invalidateQueries({ queryKey: ['telegram-user'] });
              queryClient.invalidateQueries({ queryKey: ['transactions'] });
              toast.info('Номер был отменён');
            }
          },
        });
      });
    }, 5000);

    return () => clearInterval(interval);
  }, [numbers]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success('Скопировано');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCancel = (activationId: string) => {
    setStatus.mutate(
      { activationId, status: '8' },
      {
        onSuccess: () => {
          refetch();
          queryClient.invalidateQueries({ queryKey: ['telegram-user'] });
          queryClient.invalidateQueries({ queryKey: ['transactions'] });
          toast.success('Активация отменена, средства возвращены');
        },
        onError: (err) => toast.error(err.message),
      }
    );
  };

  const handleManualCheck = (activationId: string) => {
    setPollingIds(prev => new Set(prev).add(activationId));
    checkStatus.mutate(activationId, {
      onSuccess: (result) => {
        refetch();
        if (result.status === 'code_received') {
          toast.success('SMS код получен!');
        } else if (result.status === 'cancelled') {
          queryClient.invalidateQueries({ queryKey: ['telegram-user'] });
          queryClient.invalidateQueries({ queryKey: ['transactions'] });
          toast.info('Номер был отменён');
        } else {
          toast.info('SMS ещё не получено, ожидаем...');
        }
      },
      onSettled: () => {
        setPollingIds(prev => {
          const next = new Set(prev);
          next.delete(activationId);
          return next;
        });
      },
    });
  };

  const handleTimerExpired = useCallback((activationId: string) => {
    setExpiredIds(prev => new Set(prev).add(activationId));
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2].map(i => (
          <div key={i} className="p-4 rounded-xl border bg-card">
            <Skeleton className="h-5 w-40 mb-2" />
            <Skeleton className="h-4 w-32" />
          </div>
        ))}
      </div>
    );
  }

  if (!numbers || numbers.length === 0) {
    return (
      <div className="text-center py-10 text-muted-foreground">
        <Phone className="h-10 w-10 mx-auto mb-3 opacity-50" />
        <p className="text-sm">У вас пока нет виртуальных номеров</p>
        <p className="text-xs mt-1">Купите номер в каталоге для приёма SMS</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {numbers.map((num, index) => {
        const serviceInfo = getServiceInfo(num.service);
        const statusInfo = statusLabels[num.status] || statusLabels.waiting;
        const isActive = ['waiting', 'ready', 'retry'].includes(num.status);
        const hasCode = num.status === 'code_received' && num.sms_code;
        const canCancel = isActive && !expiredIds.has(num.activation_id);

        return (
          <motion.div
            key={num.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="p-4 rounded-xl border bg-card"
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex items-center gap-2">
                <ServiceLogo serviceCode={num.service} fallbackEmoji={serviceInfo.icon} className="w-5 h-5" />
                <div>
                  <p className="font-semibold text-sm">{num.service_name || serviceInfo.name}</p>
                  <p className="text-xs text-muted-foreground">{num.country_name || num.country}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {isActive && (
                  <CancelTimer
                    createdAt={num.created_at}
                    onExpired={() => handleTimerExpired(num.activation_id)}
                  />
                )}
                <Badge variant={statusInfo.variant} className="text-xs">
                  {statusInfo.label}
                </Badge>
              </div>
            </div>

            {/* Phone number */}
            <div className="flex items-center gap-2 mb-3 p-2 rounded-lg bg-secondary/50">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span className="font-mono text-sm flex-1">+{num.phone_number}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => handleCopy(num.phone_number, `phone-${num.id}`)}
              >
                {copiedId === `phone-${num.id}` ? (
                  <Check className="h-3.5 w-3.5 text-primary" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </Button>
            </div>

            {/* SMS Code */}
            {hasCode && (
              <div className="flex items-center gap-2 mb-3 p-2 rounded-lg bg-primary/10 border border-primary/20">
                <MessageSquare className="h-4 w-4 text-primary" />
                <span className="font-mono text-lg font-bold flex-1">{num.sms_code}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => handleCopy(num.sms_code!, `code-${num.id}`)}
                >
                  {copiedId === `code-${num.id}` ? (
                    <Check className="h-3.5 w-3.5 text-primary" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </Button>
              </div>
            )}

            {/* Actions for active numbers */}
            {isActive && (
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs"
                  onClick={() => handleManualCheck(num.activation_id)}
                  disabled={pollingIds.has(num.activation_id)}
                >
                  {pollingIds.has(num.activation_id) ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="h-3.5 w-3.5" />
                  )}
                  Проверить SMS
                </Button>
                {canCancel && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-xs text-destructive"
                    onClick={() => handleCancel(num.activation_id)}
                  >
                    <X className="h-3.5 w-3.5" />
                    Отменить
                  </Button>
                )}
              </div>
            )}

            {/* Check SMS button when code received (to refresh latest code) */}
            {hasCode && (
              <div className="flex gap-2 mt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs"
                  onClick={() => handleManualCheck(num.activation_id)}
                  disabled={pollingIds.has(num.activation_id)}
                >
                  {pollingIds.has(num.activation_id) ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="h-3.5 w-3.5" />
                  )}
                  Проверить SMS
                </Button>
              </div>
            )}

            {/* Meta */}
            <div className="flex items-center justify-between mt-3 pt-2 border-t text-xs text-muted-foreground">
              <span>{new Date(num.created_at).toLocaleString('ru-RU')}</span>
              {num.price > 0 && <span>{num.price} ₽</span>}
            </div>

            {/* Review form for completed */}
            {num.status === 'completed' && (
              <InlineReviewForm numberId={num.id} />
            )}
          </motion.div>
        );
      })}
    </div>
  );
};
