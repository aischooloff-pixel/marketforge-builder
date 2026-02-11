import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface TigerPriceInfo {
  cost: string;
  count: number;
}

// Popular services with their Tiger SMS codes
export const TIGER_SERVICES = [
  { code: 'tg', name: 'Telegram', icon: '💬' },
  { code: 'wa', name: 'WhatsApp', icon: '📱' },
  { code: 'go', name: 'Google', icon: '🔍' },
  { code: 'ig', name: 'Instagram', icon: '📸' },
  { code: 'lf', name: 'TikTok', icon: '🎵' },
  { code: 'ew', name: 'YouTube', icon: '▶️' },
  { code: 'ds', name: 'Discord', icon: '🎮' },
  { code: 'tw', name: 'Twitter/X', icon: '🐦' },
  { code: 'fb', name: 'Facebook', icon: '👤' },
  { code: 'am', name: 'Amazon', icon: '📦' },
  { code: 'mb', name: 'Microsoft', icon: '💻' },
  { code: 'ya', name: 'Яндекс', icon: '🔴' },
  { code: 'me', name: 'Line', icon: '💚' },
  { code: 'oi', name: 'Tinder', icon: '🔥' },
  { code: 'vi', name: 'Viber', icon: '💜' },
  { code: 'ot', name: 'Любой другой', icon: '📋' },
];

// Tiger SMS country codes (numeric)
export const TIGER_COUNTRIES = [
  { code: '0', name: 'Россия', flag: 'ru' },
  { code: '1', name: 'Украина', flag: 'ua' },
  { code: '2', name: 'Казахстан', flag: 'kz' },
  { code: '3', name: 'Китай', flag: 'cn' },
  { code: '4', name: 'Филиппины', flag: 'ph' },
  { code: '5', name: 'Индонезия', flag: 'id' },
  { code: '6', name: 'Малайзия', flag: 'my' },
  { code: '7', name: 'Кения', flag: 'ke' },
  { code: '10', name: 'Англия', flag: 'gb' },
  { code: '12', name: 'США', flag: 'us' },
  { code: '13', name: 'Израиль', flag: 'il' },
  { code: '14', name: 'Гонконг', flag: 'hk' },
  { code: '15', name: 'Польша', flag: 'pl' },
  { code: '16', name: 'Канада', flag: 'ca' },
  { code: '19', name: 'Египет', flag: 'eg' },
  { code: '22', name: 'Индия', flag: 'in' },
  { code: '24', name: 'Ирландия', flag: 'ie' },
  { code: '31', name: 'Нидерланды', flag: 'nl' },
  { code: '32', name: 'Колумбия', flag: 'co' },
  { code: '33', name: 'Франция', flag: 'fr' },
  { code: '34', name: 'Бангладеш', flag: 'bd' },
  { code: '36', name: 'Литва', flag: 'lt' },
  { code: '37', name: 'Эстония', flag: 'ee' },
  { code: '39', name: 'Латвия', flag: 'lv' },
  { code: '40', name: 'Германия', flag: 'de' },
  { code: '41', name: 'Сербия', flag: 'rs' },
  { code: '43', name: 'Мексика', flag: 'mx' },
  { code: '44', name: 'Чехия', flag: 'cz' },
  { code: '46', name: 'Нигерия', flag: 'ng' },
  { code: '49', name: 'Турция', flag: 'tr' },
  { code: '52', name: 'Румыния', flag: 'ro' },
  { code: '54', name: 'Испания', flag: 'es' },
  { code: '56', name: 'Аргентина', flag: 'ar' },
  { code: '62', name: 'Бразилия', flag: 'br' },
  { code: '63', name: 'Швеция', flag: 'se' },
  { code: '66', name: 'Таиланд', flag: 'th' },
  { code: '67', name: 'Вьетнам', flag: 'vn' },
  { code: '73', name: 'Италия', flag: 'it' },
  { code: '74', name: 'Грузия', flag: 'ge' },
  { code: '77', name: 'Япония', flag: 'jp' },
  { code: '78', name: 'Португалия', flag: 'pt' },
  { code: '84', name: 'Молдова', flag: 'md' },
  { code: '85', name: 'Южная Корея', flag: 'kr' },
  { code: '86', name: 'Австралия', flag: 'au' },
  { code: '87', name: 'Узбекистан', flag: 'uz' },
];

export const useTigerPrices = (service?: string, country?: string) => {
  return useQuery({
    queryKey: ['tiger-prices', service, country],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('tiger-sms', {
        body: { action: 'getPrices', service, country },
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
