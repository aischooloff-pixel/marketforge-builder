import { useState, useEffect, useCallback } from 'react';
import { useMyVirtualNumbers, useCheckSmsStatus, useSetActivationStatus, TIGER_SERVICES } from '@/hooks/useTigerSms';
import { useTelegram } from '@/contexts/TelegramContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Phone, MessageSquare, Copy, Check, RefreshCw, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

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

export const VirtualNumbersTab = () => {
  const { user } = useTelegram();
  const { data: numbers, isLoading, refetch } = useMyVirtualNumbers(user?.id);
  const checkStatus = useCheckSmsStatus();
  const setStatus = useSetActivationStatus();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [pollingIds, setPollingIds] = useState<Set<string>>(new Set());

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
          toast.info('Активация отменена');
        },
        onError: (err) => toast.error(err.message),
      }
    );
  };

  const handleComplete = (activationId: string) => {
    setStatus.mutate(
      { activationId, status: '6' },
      {
        onSuccess: () => {
          refetch();
          toast.success('Активация завершена');
        },
        onError: (err) => toast.error(err.message),
      }
    );
  };

  const handleRetry = (activationId: string) => {
    setStatus.mutate(
      { activationId, status: '3' },
      {
        onSuccess: () => {
          refetch();
          toast.info('Запрошено повторное SMS');
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
                <span className="text-lg">{serviceInfo.icon}</span>
                <div>
                  <p className="font-semibold text-sm">{num.service_name || serviceInfo.name}</p>
                  <p className="text-xs text-muted-foreground">{num.country_name || num.country}</p>
                </div>
              </div>
              <Badge variant={statusInfo.variant} className="text-xs">
                {statusInfo.label}
              </Badge>
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

            {/* Actions */}
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
                {num.status !== 'retry' && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-xs"
                    onClick={() => handleRetry(num.activation_id)}
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Повторное SMS
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs text-destructive"
                  onClick={() => handleCancel(num.activation_id)}
                >
                  <X className="h-3.5 w-3.5" />
                  Отменить
                </Button>
              </div>
            )}

            {hasCode && num.status === 'code_received' && (
              <div className="flex gap-2 mt-2">
                <Button
                  size="sm"
                  className="gap-1.5 text-xs"
                  onClick={() => handleComplete(num.activation_id)}
                >
                  <Check className="h-3.5 w-3.5" />
                  Подтвердить
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs"
                  onClick={() => handleRetry(num.activation_id)}
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Другой код
                </Button>
              </div>
            )}

            {/* Meta */}
            <div className="flex items-center justify-between mt-3 pt-2 border-t text-xs text-muted-foreground">
              <span>{new Date(num.created_at).toLocaleString('ru-RU')}</span>
              {num.price > 0 && <span>{num.price} ₽</span>}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};
