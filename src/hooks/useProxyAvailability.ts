import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface ProxyAvailability {
  countries: string[];
  availability: Record<string, number>;
  balance: string;
}

export const useProxyAvailability = (version: number = 3, enabled: boolean = true) => {
  return useQuery({
    queryKey: ['proxy-availability', version],
    queryFn: async (): Promise<ProxyAvailability> => {
      const { data, error } = await supabase.functions.invoke('px6-buy-proxy', {
        body: { action: 'availability', version },
      });

      if (error) {
        console.error('Error fetching proxy availability:', error);
        throw error;
      }

      return data as ProxyAvailability;
    },
    enabled,
    staleTime: 1000 * 30, // 30 seconds cache
    refetchInterval: 1000 * 60, // refetch every 1 minute
  });
};
