import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const FALLBACK_RATE = 90;

export const useExchangeRate = () => {
  return useQuery({
    queryKey: ['exchange-rate'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('cryptobot-exchange-rate');
      if (error || !data?.success) {
        console.warn('Failed to fetch exchange rate, using fallback');
        return FALLBACK_RATE;
      }
      return data.rate as number;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
};

/** Convert RUB price to USD using the exchange rate */
export const rubToUsd = (rubPrice: number, rate: number): number => {
  return Math.round((rubPrice / rate) * 100) / 100;
};

/** Format USD price */
export const formatUsd = (usd: number): string => {
  return usd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};
