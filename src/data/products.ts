// Static reference data used by CountrySelector and Index page

export interface Country {
  code: string;
  name: string;
  flag: string;
  latency?: number;
  available?: boolean;
}

export interface Service {
  id: string;
  name: string;
  icon: string;
}

export const countries: Country[] = [
  { code: 'RU', name: 'Россия', flag: '🇷🇺', latency: 12, available: true },
  { code: 'US', name: 'США', flag: '🇺🇸', latency: 85, available: true },
  { code: 'GB', name: 'Британия', flag: '🇬🇧', latency: 45, available: true },
  { code: 'DE', name: 'Германия', flag: '🇩🇪', latency: 38, available: true },
  { code: 'FR', name: 'Франция', flag: '🇫🇷', latency: 42, available: true },
  { code: 'NL', name: 'Нидерланды', flag: '🇳🇱', latency: 35, available: true },
  { code: 'PL', name: 'Польша', flag: '🇵🇱', latency: 30, available: true },
  { code: 'UA', name: 'Украина', flag: '🇺🇦', latency: 20, available: true },
  { code: 'KZ', name: 'Казахстан', flag: '🇰🇿', latency: 55, available: true },
  { code: 'TR', name: 'Турция', flag: '🇹🇷', latency: 48, available: true },
  { code: 'JP', name: 'Япония', flag: '🇯🇵', latency: 120, available: true },
  { code: 'SG', name: 'Сингапур', flag: '🇸🇬', latency: 110, available: true },
  { code: 'AU', name: 'Австралия', flag: '🇦🇺', latency: 150, available: true },
  { code: 'CA', name: 'Канада', flag: '🇨🇦', latency: 90, available: true },
  { code: 'IT', name: 'Италия', flag: '🇮🇹', latency: 40, available: true },
  { code: 'ES', name: 'Испания', flag: '🇪🇸', latency: 43, available: true },
  { code: 'BR', name: 'Бразилия', flag: '🇧🇷', latency: 130, available: true },
  { code: 'IN', name: 'Индия', flag: '🇮🇳', latency: 95, available: true },
  { code: 'KR', name: 'Корея', flag: '🇰🇷', latency: 115, available: true },
  { code: 'HK', name: 'Гонконг', flag: '🇭🇰', latency: 105, available: true },
];

export const services: Service[] = [
  { id: 'telegram', name: 'Telegram', icon: '✈️' },
  { id: 'tiktok', name: 'TikTok', icon: '🎵' },
  { id: 'youtube', name: 'YouTube', icon: '▶️' },
  { id: 'instagram', name: 'Instagram', icon: '📸' },
  { id: 'whatsapp', name: 'WhatsApp', icon: '💬' },
  { id: 'google', name: 'Google', icon: '🔍' },
];

export const storeData = {
  store_meta: {
    name: 'TEMKA.STORE',
    description: 'Автоматизированный магазин цифровых товаров и услуг',
  },
};
