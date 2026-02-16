import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTelegram } from '@/contexts/TelegramContext';
import { useQueryClient } from '@tanstack/react-query';

interface PaymentResult {
  success: boolean;
  orderId?: string;
  invoiceUrl?: string;
  error?: string;
}

interface CartItem {
  productId: string;
  productName: string;
  price: number;
  quantity: number;
  options?: {
    country?: string;
    services?: string[];
  };
}

export const usePayment = () => {
  const { user, webApp, refreshUser } = useTelegram();
  const queryClient = useQueryClient();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getInitData = (): string | null => {
    return webApp?.initData || null;
  };

  // Pay with CryptoBot (optionally using partial balance)
  const payWithCryptoBot = async (
    items: CartItem[],
    total: number,
    balanceToUse: number = 0
  ): Promise<PaymentResult> => {
    if (!user) {
      return { success: false, error: 'Пользователь не авторизован' };
    }

    const initData = getInitData();
    if (!initData) {
      return { success: false, error: 'Требуется авторизация через Telegram' };
    }

    if (balanceToUse > user.balance) {
      return { success: false, error: 'Недостаточно средств на балансе' };
    }

    const cryptoAmount = total - balanceToUse;

    setIsProcessing(true);
    setError(null);

    try {
      // All validation (stock, max_per_user) + order creation now happens server-side
      // Create CryptoBot invoice via edge function
      const { data: invoiceData, error: invoiceError } = await supabase.functions.invoke(
        'cryptobot-create-invoice',
        {
          body: {
            initData,
            amount: cryptoAmount,
            balanceToUse,
            description: `Заказ${balanceToUse > 0 ? ` (баланс: ${balanceToUse}₽)` : ''}`,
            items: items.map(item => ({
              productId: item.productId,
              productName: item.productName,
              price: item.price,
              quantity: item.quantity,
              options: item.options || {},
            })),
          },
        }
      );

      if (invoiceError || !invoiceData?.success) {
        throw new Error(invoiceData?.error || 'Ошибка создания счёта');
      }

      return {
        success: true,
        orderId: invoiceData.orderId,
        invoiceUrl: invoiceData.miniAppUrl || invoiceData.payUrl,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Ошибка оплаты';
      setError(message);
      return { success: false, error: message };
    } finally {
      setIsProcessing(false);
    }
  };

  // Pay with balance — all mutations happen server-side via edge function
  const payWithBalance = async (
    items: CartItem[],
    total: number
  ): Promise<PaymentResult> => {
    if (!user) {
      return { success: false, error: 'Пользователь не авторизован' };
    }

    const initData = getInitData();
    if (!initData) {
      return { success: false, error: 'Требуется авторизация через Telegram' };
    }

    if (user.balance < total) {
      return { success: false, error: 'Недостаточно средств на балансе' };
    }

    setIsProcessing(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('pay-with-balance', {
        body: {
          initData,
          items: items.map(item => ({
            productId: item.productId,
            productName: item.productName,
            price: item.price,
            quantity: item.quantity,
            options: item.options || {},
          })),
          total,
        },
      });

      if (fnError) {
        throw new Error(fnError.message || 'Ошибка оплаты');
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      // Refresh user to update balance
      await refreshUser();

      // Invalidate stock queries so UI updates
      queryClient.invalidateQueries({ queryKey: ['product-stock'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });

      return {
        success: true,
        orderId: data.orderId,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Ошибка оплаты';
      setError(message);
      return { success: false, error: message };
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    payWithCryptoBot,
    payWithBalance,
    isProcessing,
    error,
  };
};
