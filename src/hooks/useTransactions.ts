import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTelegram } from '@/contexts/TelegramContext';

export interface Transaction {
  id: string;
  type: 'deposit' | 'purchase' | 'refund' | 'bonus';
  amount: number;
  balance_after: number;
  description: string | null;
  payment_id: string | null;
  order_id: string | null;
  created_at: string;
}

const mockTransactions: Transaction[] = [
  {
    id: 'tx-001',
    type: 'deposit',
    amount: 5000,
    balance_after: 5000,
    description: 'Пополнение через CryptoBot',
    payment_id: 'cb_test_100',
    order_id: null,
    created_at: new Date(Date.now() - 86400000 * 7).toISOString(),
  },
  {
    id: 'tx-002',
    type: 'purchase',
    amount: -1990,
    balance_after: 3010,
    description: 'Покупка: VK API Toolkit',
    payment_id: null,
    order_id: 'test-order-001',
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: 'tx-003',
    type: 'purchase',
    amount: -1490,
    balance_after: 1520,
    description: 'Покупка: Country Proxy Pack',
    payment_id: null,
    order_id: 'test-order-002',
    created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
  },
  {
    id: 'tx-004',
    type: 'bonus',
    amount: 500,
    balance_after: 2020,
    description: 'Бонус за отзыв',
    payment_id: null,
    order_id: null,
    created_at: new Date(Date.now() - 86400000).toISOString(),
  },
];

export const useTransactions = () => {
  const { user, isAuthenticated, isTelegramWebApp, webApp } = useTelegram();

  return useQuery({
    queryKey: ['transactions', user?.id],
    queryFn: async (): Promise<Transaction[]> => {
      // Dev mode — return mock data
      if (!isTelegramWebApp) return mockTransactions;

      if (!user?.id || !webApp?.initData) return [];

      const { data, error } = await supabase.functions.invoke('user-data', {
        body: { initData: webApp.initData, path: '/transactions' },
      });

      if (error) {
        console.error('Error fetching transactions:', error);
        throw error;
      }

      return (data || []) as Transaction[];
    },
    enabled: isAuthenticated && !!user?.id,
    staleTime: 1000 * 60 * 2,
  });
};

// Helper to get transaction type label in Russian
export const getTransactionTypeLabel = (type: Transaction['type']): string => {
  const labels: Record<Transaction['type'], string> = {
    deposit: 'Пополнение',
    purchase: 'Покупка',
    refund: 'Возврат',
    bonus: 'Бонус',
  };
  return labels[type] || type;
};

// Helper to determine if transaction is positive (adds to balance)
export const isPositiveTransaction = (type: Transaction['type']): boolean => {
  return type === 'deposit' || type === 'refund' || type === 'bonus';
};
