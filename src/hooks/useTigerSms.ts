import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export { TIGER_SERVICES, TIGER_COUNTRIES, getServiceByCode, getCountryByCode } from '@/data/tigerSmsData';
export type { TigerService, TigerCountry } from '@/data/tigerSmsData';

interface TigerPriceInfo {
  cost: string;
  count: number;
}

export const useTigerPrices = (service?: string) => {
  return useQuery({
    queryKey: ['tiger-prices', service],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('tiger-sms', {
        body: { action: 'getPrices', service },
      });
      if (error) throw error;
      // API returns { country_code: { service_code: { cost, count } } }
      return data.prices as Record<string, Record<string, TigerPriceInfo>>;
    },
    enabled: !!service,
    staleTime: 1000 * 60,
  });
};

export const useTigerBalance = () => {
  return useQuery({
    queryKey: ['tiger-balance'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('tiger-sms', {
        body: { action: 'getBalance' },
      });
      if (error) throw error;
      return data.balance as number;
    },
    staleTime: 1000 * 30,
  });
};

export const useBuyNumber = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      service: string;
      serviceName: string;
      country: string;
      countryName: string;
      userId: string;
      price: number;
      orderId?: string;
    }) => {
      const { data, error } = await supabase.functions.invoke('tiger-sms', {
        body: { action: 'getNumber', ...params },
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      return data as { success: boolean; activationId: string; phoneNumber: string };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-virtual-numbers'] });
    },
  });
};

export const useCheckSmsStatus = () => {
  return useMutation({
    mutationFn: async (activationId: string) => {
      const { data, error } = await supabase.functions.invoke('tiger-sms', {
        body: { action: 'getStatus', activationId },
      });
      if (error) throw error;
      return data as { status: string; code?: string };
    },
  });
};

export const useSetActivationStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: { activationId: string; status: string }) => {
      const { data, error } = await supabase.functions.invoke('tiger-sms', {
        body: { action: 'setStatus', activationId: params.activationId, status: params.status },
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-virtual-numbers'] });
    },
  });
};

export const useMyVirtualNumbers = (userId?: string) => {
  return useQuery({
    queryKey: ['my-virtual-numbers', userId],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('tiger-sms', {
        body: { action: 'getMyNumbers', userId },
      });
      if (error) throw error;
      return data.numbers as Array<{
        id: string;
        activation_id: string;
        phone_number: string;
        service: string;
        service_name: string;
        country: string;
        country_name: string;
        price: number;
        status: string;
        sms_code: string | null;
        sms_full: string | null;
        created_at: string;
        completed_at: string | null;
      }>;
    },
    enabled: !!userId,
    refetchInterval: 1000 * 15,
  });
};
