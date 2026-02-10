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

export const useTransactions = () => {
  const { user, isAuthenticated, webApp } = useTelegram();

  return useQuery({
    queryKey: ['transactions', user?.id],
    queryFn: async (): Promise<Transaction[]> => {
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
