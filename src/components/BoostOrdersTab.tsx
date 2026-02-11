import { useState, useEffect } from 'react';
import { useTelegram } from '@/contexts/TelegramContext';
import { useBoostOrders } from '@/hooks/useProfiLike';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { motion } from 'framer-motion';
import { TrendingUp, RefreshCw, Loader2, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

const statusConfig: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string; emoji: string }> = {
  pending: { variant: 'outline', label: 'Ожидает', emoji: '⏳' },
  processing: { variant: 'secondary', label: 'Обработка', emoji: '⏳' },
  in_progress: { variant: 'secondary', label: 'Выполняется', emoji: '🔄' },
  completed: { variant: 'default', label: 'Выполнен', emoji: '✅' },
  partial: { variant: 'outline', label: 'Частично', emoji: '⚠️' },
  cancelled: { variant: 'destructive', label: 'Отменён', emoji: '❌' },
  error: { variant: 'destructive', label: 'Ошибка', emoji: '❌' },
};

export const BoostOrdersTab = () => {
  const { user } = useTelegram();
  const { data: orders = [], isLoading, refetch } = useBoostOrders(user?.id);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefreshStatuses = async () => {
    setIsRefreshing(true);
    try {
      await supabase.functions.invoke('profi-like', {
        body: { action: 'checkAllPending' },
      });
      await refetch();
      toast.success('Статусы обновлены');
    } catch {
      toast.error('Ошибка обновления статусов');
    } finally {
      setIsRefreshing(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="p-4 rounded-xl border bg-card">
            <Skeleton className="h-5 w-32 mb-2" />
            <Skeleton className="h-4 w-24 mb-3" />
            <Skeleton className="h-4 w-full" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
      {/* Refresh button */}
      {orders.length > 0 && (
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefreshStatuses}
            disabled={isRefreshing}
            className="gap-1.5 text-xs"
          >
            {isRefreshing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            Обновить статусы
          </Button>
        </div>
      )}

      {orders.length === 0 ? (
        <div className="text-center py-10 md:py-12 text-muted-foreground">
          <TrendingUp className="h-10 w-10 md:h-12 md:w-12 mx-auto mb-3 md:mb-4 opacity-50" />
          <p className="text-sm md:text-base">У вас пока нет заказов на накрутку</p>
        </div>
      ) : (
        orders.map((order: any, index: number) => {
          const config = statusConfig[order.status] || statusConfig.pending;
          return (
            <motion.div
              key={order.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="p-4 md:p-6 rounded-xl border bg-card"
            >
              <div className="flex justify-between gap-3 mb-2">
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h3 className="font-semibold text-sm md:text-base">
                      {config.emoji} {order.category}
                    </h3>
                    <Badge variant={config.variant} className="text-xs">
                      {config.label}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{order.service_name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {formatDate(order.created_at)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-base md:text-lg">
                    {parseFloat(order.price).toLocaleString('ru-RU')} ₽
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {order.quantity.toLocaleString()} шт
                  </p>
                </div>
              </div>

              {/* Link */}
              <div className="pt-2 border-t mt-2">
                <a
                  href={order.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary hover:underline flex items-center gap-1 truncate"
                >
                  <ExternalLink className="h-3 w-3 flex-shrink-0" />
                  <span className="truncate">{order.link}</span>
                </a>
              </div>

              {/* Extra info */}
              {(order.start_count !== null || order.remains !== null) && (
                <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
                  {order.start_count !== null && <span>Начало: {order.start_count}</span>}
                  {order.remains !== null && <span>Осталось: {order.remains}</span>}
                </div>
              )}
            </motion.div>
          );
        })
      )}
    </motion.div>
  );
};
