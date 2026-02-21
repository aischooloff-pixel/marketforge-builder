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

const mockOrders: Order[] = [
  {
    id: 'test-order-001',
    status: 'completed',
    total: 1990,
    payment_method: 'cryptobot',
    payment_id: 'cb_test_123',
    delivered_content: 'login:test_user\npassword:qwerty123',
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    completed_at: new Date(Date.now() - 86400000 * 2 + 60000).toISOString(),
    order_items: [
      { id: 'item-1', product_name: 'VK API Toolkit', price: 1990, quantity: 1, options: null },
    ],
  },
  {
    id: 'test-order-002',
    status: 'completed',
    total: 1490,
    payment_method: 'balance',
    payment_id: null,
    delivered_content: 'proxy://ru-proxy-01.temka.store:8080',
    created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
    completed_at: new Date(Date.now() - 86400000 * 5 + 30000).toISOString(),
    order_items: [
      { id: 'item-2', product_name: 'Country Proxy Pack 🇷🇺', price: 1490, quantity: 1, options: null },
    ],
  },
  {
    id: 'test-order-003',
    status: 'pending',
    total: 2990,
    payment_method: null,
    payment_id: null,
    delivered_content: null,
    created_at: new Date(Date.now() - 3600000).toISOString(),
    completed_at: null,
    order_items: [
      { id: 'item-3', product_name: 'Premium Proxy Bundle', price: 2990, quantity: 1, options: null },
    ],
  },
];

export const useOrders = () => {
  const { user, isAuthenticated, isTelegramWebApp, webApp } = useTelegram();

  return useQuery({
    queryKey: ['orders', user?.id],
    queryFn: async (): Promise<Order[]> => {
      // Dev mode — return mock data
      if (!isTelegramWebApp) return mockOrders;

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
