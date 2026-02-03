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
  const { user, isAuthenticated } = useTelegram();

  return useQuery({
    queryKey: ['orders', user?.id],
    queryFn: async (): Promise<Order[]> => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          status,
          total,
          payment_method,
          payment_id,
          delivered_content,
          created_at,
          completed_at,
          order_items (
            id,
            product_name,
            price,
            quantity,
            options
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching orders:', error);
        throw error;
      }

      return (data || []).map(order => ({
        ...order,
        order_items: order.order_items || [],
      })) as Order[];
    },
    enabled: isAuthenticated && !!user?.id,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
};

export const useOrder = (orderId: string | undefined) => {
  const { user, isAuthenticated } = useTelegram();

  return useQuery({
    queryKey: ['order', orderId],
    queryFn: async (): Promise<Order | null> => {
      if (!orderId || !user?.id) return null;

      const { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          status,
          total,
          payment_method,
          payment_id,
          delivered_content,
          created_at,
          completed_at,
          order_items (
            id,
            product_name,
            price,
            quantity,
            options
          )
        `)
        .eq('id', orderId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching order:', error);
        throw error;
      }

      if (!data) return null;

      return {
        ...data,
        order_items: data.order_items || [],
      } as Order;
    },
    enabled: isAuthenticated && !!orderId && !!user?.id,
    staleTime: 1000 * 30, // 30 seconds
  });
};
