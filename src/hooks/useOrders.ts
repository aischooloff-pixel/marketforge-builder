import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTelegram } from '@/contexts/TelegramContext';

export interface OrderItem {
  id: string;
  product_name: string;
  price: number;
  quantity: number;
  options: Record<string, unknown> | null;
}

export interface Order {
  id: string;
  status: 'pending' | 'paid' | 'completed' | 'cancelled' | 'refunded';
  total: number;
  payment_method: string | null;
  payment_id: string | null;
  delivered_content: string | null;
  created_at: string;
  completed_at: string | null;
  order_items: OrderItem[];
}



export const useOrders = () => {
  const { user, isAuthenticated, isTelegramWebApp, webApp } = useTelegram();

  return useQuery({
    queryKey: ['orders', user?.id],
    queryFn: async (): Promise<Order[]> => {
      // Not in Telegram — no data
      if (!isTelegramWebApp) return [];

      if (!user?.id || !webApp?.initData) return [];

      const { data, error } = await supabase.functions.invoke('user-data', {
        body: { initData: webApp.initData, path: '/orders' },
      });

      if (error) {
        console.error('Error fetching orders:', error);
        throw error;
      }

      return (data || []).map((order: any) => ({
        ...order,
        order_items: order.order_items || [],
      })) as Order[];
    },
    enabled: isAuthenticated && !!user?.id,
    staleTime: 1000 * 60 * 2,
  });
};

export const useOrder = (orderId: string | undefined) => {
  const { user, isAuthenticated, webApp } = useTelegram();

  return useQuery({
    queryKey: ['order', orderId],
    queryFn: async (): Promise<Order | null> => {
      if (!orderId || !user?.id || !webApp?.initData) return null;

      const { data, error } = await supabase.functions.invoke('user-data', {
        body: { initData: webApp.initData, path: '/orders' },
      });

      if (error) {
        console.error('Error fetching order:', error);
        throw error;
      }

      const orders = data || [];
      const order = orders.find((o: any) => o.id === orderId);
      if (!order) return null;

      return {
        ...order,
        order_items: order.order_items || [],
      } as Order;
    },
    enabled: isAuthenticated && !!orderId && !!user?.id,
    staleTime: 1000 * 30,
  });
};
