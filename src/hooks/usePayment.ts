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
  const { user, refreshUser } = useTelegram();
  const queryClient = useQueryClient();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pay with CryptoBot (optionally using partial balance)
  const payWithCryptoBot = async (
    items: CartItem[],
    total: number,
    balanceToUse: number = 0
  ): Promise<PaymentResult> => {
    if (!user) {
      return { success: false, error: 'Пользователь не авторизован' };
    }

    if (balanceToUse > user.balance) {
      return { success: false, error: 'Недостаточно средств на балансе' };
    }

    const cryptoAmount = total - balanceToUse;

    setIsProcessing(true);
    setError(null);

    try {
      // Check stock availability and max_per_user limits (read-only, safe via anon)
      for (const item of items) {
        const { data: productData } = await supabase
          .from('products')
          .select('max_per_user')
          .eq('id', item.productId)
          .single();

        const { count: fileCount } = await supabase
          .from('product_items')
          .select('*', { count: 'exact', head: true })
          .eq('product_id', item.productId)
          .not('file_url', 'is', null);

        const isUnlimited = (fileCount || 0) > 0;

        if (!isUnlimited) {
          const { count: availableStock } = await supabase
            .from('product_items')
            .select('*', { count: 'exact', head: true })
            .eq('product_id', item.productId)
            .eq('is_sold', false);

          if ((availableStock || 0) < item.quantity) {
            setIsProcessing(false);
            return { success: false, error: `Товар "${item.productName}" — в наличии только ${availableStock || 0} шт` };
          }
        }

        if (productData && productData.max_per_user > 0) {
          const { count } = await supabase
            .from('order_items')
            .select('*, orders!inner(user_id, status)', { count: 'exact', head: true })
            .eq('product_id', item.productId)
            .eq('orders.user_id', user.id)
            .in('orders.status', ['paid', 'completed']);

          if ((count || 0) >= productData.max_per_user) {
            setIsProcessing(false);
            return { success: false, error: `Товар "${item.productName}" можно купить только ${productData.max_per_user} раз(а)` };
          }
        }
      }

      // Create order via client (INSERT is allowed)
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: user.id,
          total,
          status: 'pending',
          payment_method: balanceToUse > 0 ? 'balance+cryptobot' : 'cryptobot',
        })
        .select()
        .single();

      if (orderError) {
        throw new Error('Не удалось создать заказ');
      }

      // Create order items (INSERT is allowed)
      const orderItems = items.map(item => ({
        order_id: order.id,
        product_id: item.productId,
        product_name: item.productName,
        price: item.price * item.quantity,
        quantity: item.quantity,
        options: item.options || {},
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) {
        console.error('Order items error:', itemsError);
      }

      // Create CryptoBot invoice via edge function (handles payment_id update securely)
      const { data: invoiceData, error: invoiceError } = await supabase.functions.invoke(
        'cryptobot-create-invoice',
        {
          body: {
            userId: user.id,
            amount: cryptoAmount,
            orderId: order.id,
            balanceToUse,
            description: `Заказ #${order.id.substring(0, 8)}${balanceToUse > 0 ? ` (баланс: ${balanceToUse}₽)` : ''}`,
          },
        }
      );

      if (invoiceError || !invoiceData?.success) {
        throw new Error(invoiceData?.error || 'Ошибка создания счёта');
      }

      return {
        success: true,
        orderId: order.id,
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

    if (user.balance < total) {
      return { success: false, error: 'Недостаточно средств на балансе' };
    }

    setIsProcessing(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('pay-with-balance', {
        body: {
          userId: user.id,
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
