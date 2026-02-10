import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTelegram } from '@/contexts/TelegramContext';

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
      // Create order
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

      // Create order items
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

      // NOTE: Balance is NOT deducted here — it will be deducted in the webhook
      // after CryptoBot confirms payment, to avoid losing balance on unpaid invoices.

      // Create CryptoBot invoice for the remaining amount
      // Pass balanceToUse so the webhook can deduct it upon payment confirmation
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

      // Update order with payment_id
      await supabase
        .from('orders')
        .update({ payment_id: invoiceData.invoiceId.toString() })
        .eq('id', order.id);

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

  // Pay with balance
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
      // Create order
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: user.id,
          total,
          status: 'paid',
          payment_method: 'balance',
        })
        .select()
        .single();

      if (orderError) {
        throw new Error('Не удалось создать заказ');
      }

      // Create order items
      const orderItems = items.map(item => ({
        order_id: order.id,
        product_id: item.productId,
        product_name: item.productName,
        price: item.price * item.quantity,
        quantity: item.quantity,
        options: item.options || {},
      }));

      await supabase.from('order_items').insert(orderItems);

      // Deduct balance and create transaction
      const newBalance = user.balance - total;

      const { error: profileError } = await supabase
        .from('profiles')
        .update({ balance: newBalance })
        .eq('id', user.id);

      if (profileError) {
        throw new Error('Ошибка списания баланса');
      }

      // Create transaction record
      await supabase.from('transactions').insert({
        user_id: user.id,
        type: 'purchase',
        amount: -total,
        balance_after: newBalance,
        order_id: order.id,
        description: `Оплата заказа #${order.id.substring(0, 8)}`,
      });

      // Trigger auto-delivery via edge function
      const { data: deliveryData } = await supabase.functions.invoke('process-order', {
        body: { orderId: order.id },
      });

      // Refresh user to update balance
      await refreshUser();

      return {
        success: true,
        orderId: order.id,
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
