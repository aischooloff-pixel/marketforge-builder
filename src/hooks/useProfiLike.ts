import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ProfiService {
  service: number;
  name: string;
  type: string;
  category: string;
  rate: string;
  min: number;
  max: number;
}

export const useProfiServices = () => {
  return useQuery({
    queryKey: ['profi-services'],
    queryFn: async (): Promise<ProfiService[]> => {
      const { data, error } = await supabase.functions.invoke('profi-like', {
        body: { action: 'getServices' },
      });

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      return data.services || [];
    },
    staleTime: 1000 * 60 * 10, // 10 min cache
  });
};

export const useProfiCategories = (services: ProfiService[] | undefined) => {
  if (!services) return [];
  const cats = new Set(services.map((s) => s.category));
  return Array.from(cats).sort();
};

export const useCreateBoostOrder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      serviceId: number;
      serviceName: string;
      category: string;
      link: string;
      quantity: number;
      rate: number;
      userId: string;
    }) => {
      const { data, error } = await supabase.functions.invoke('profi-like', {
        body: { action: 'createOrder', ...params },
      });

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      return data as { success: boolean; orderId: string; price: number };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profi-boost-orders'] });
    },
  });
};

export const useBoostOrders = (userId: string | undefined) => {
  return useQuery({
    queryKey: ['profi-boost-orders', userId],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('profi-like', {
        body: { action: 'getMyOrders', userId },
      });

      if (error) throw new Error(error.message);
      return data.orders || [];
    },
    enabled: !!userId,
    staleTime: 1000 * 30,
  });
};
