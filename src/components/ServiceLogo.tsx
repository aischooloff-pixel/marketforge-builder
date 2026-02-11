import { cn } from '@/lib/utils';
import { useState } from 'react';

// Map Tiger SMS service codes to Simple Icons slugs
const LOGO_MAP: Record<string, { slug: string; color: string }> = {
  // Мессенджеры
  tg: { slug: 'telegram', color: '26A5E4' },
  wa: { slug: 'whatsapp', color: '25D366' },
  vi: { slug: 'viber', color: '7360F2' },
  wb: { slug: 'wechat', color: '07C160' },
  ds: { slug: 'discord', color: '5865F2' },
  me: { slug: 'line', color: '00C300' },
  bw: { slug: 'signal', color: '3A76F0' },
  qq: { slug: 'tencentqq', color: 'EB1923' },
  kt: { slug: 'kakaotalk', color: 'FAE100' },
  im: { slug: 'imo', color: '54C7EC' },
  // Соцсети
  ig: { slug: 'instagram', color: 'E4405F' },
  lf: { slug: 'tiktok', color: '000000' },
  tw: { slug: 'x', color: '000000' },
  fb: { slug: 'facebook', color: '0866FF' },
  vk: { slug: 'vk', color: '0077FF' },
  ok: { slug: 'odnoklassniki', color: 'EE8208' },
  hb: { slug: 'twitch', color: '9146FF' },
  fu: { slug: 'snapchat', color: 'FFFC00' },
  tn: { slug: 'linkedin', color: '0A66C2' },
  kc: { slug: 'vinted', color: '09B1BA' },
  kf: { slug: 'sinaweibo', color: 'E6162D' },
  ui: { slug: 'youtube', color: 'FF0000' },
  // Почта и облако
  go: { slug: 'google', color: '4285F4' },
  ya: { slug: 'yandex', color: 'FF0000' },
  mm: { slug: 'microsoft', color: '5E5E5E' },
  ma: { slug: 'maildotru', color: '005FF9' },
  dp: { slug: 'protonmail', color: '6D4AFF' },
  wx: { slug: 'apple', color: '000000' },
  mb: { slug: 'yahoo', color: '6001D2' },
  // AI
  dr: { slug: 'openai', color: '412991' },
  acz: { slug: 'anthropic', color: 'D4A27F' },
  // Маркетплейсы
  am: { slug: 'amazon', color: 'FF9900' },
  sg: { slug: 'ozon', color: '005BFF' },
  av: { slug: 'avito', color: '00AAFF' },
  ep: { slug: 'temu', color: 'F55F2C' },
  an: { slug: 'adidas', color: '000000' },
  ew: { slug: 'nike', color: '000000' },
  ka: { slug: 'shopee', color: 'EE4D2D' },
  shn: { slug: 'shein', color: '000000' },
  dh: { slug: 'ebay', color: 'E53238' },
  xd: { slug: 'tokopedia', color: '42B549' },
  pr: { slug: 'trendyol', color: 'F27A1A' },
  yn: { slug: 'allegro', color: 'FF5A00' },
  ab: { slug: 'alibaba', color: 'FF6A00' },
  hx: { slug: 'aliexpress', color: 'FF4747' },
  // Транспорт
  ub: { slug: 'uber', color: '000000' },
  tx: { slug: 'bolt', color: '34D186' },
  xk: { slug: 'didi', color: 'FF7A13' },
  tu: { slug: 'lyft', color: 'FF00BF' },
  ua: { slug: 'blablacar', color: '00AAFF' },
  rl: { slug: 'indriver', color: '71C557' },
  // Доставка
  ac: { slug: 'doordash', color: 'FF3008' },
  rr: { slug: 'wolt', color: '009DE0' },
  dy: { slug: 'zomato', color: 'CB202D' },
  // Финансы
  gc: { slug: 'tradingview', color: '131722' },
  bo: { slug: 'wise', color: '9FE870' },
  ts: { slug: 'paypal', color: '003087' },
  ij: { slug: 'revolut', color: '0075EB' },
  nc: { slug: 'payoneer', color: 'FF4800' },
  re: { slug: 'coinbase', color: '0052FF' },
  ti: { slug: 'cryptocom', color: '002D74' },
  nu: { slug: 'stripe', color: '635BFF' },
  // Дейтинг
  oi: { slug: 'tinder', color: 'FF6B6B' },
  mo: { slug: 'bumble', color: 'FAC515' },
  qv: { slug: 'badoo', color: '783BF9' },
  // Игры
  mt: { slug: 'steam', color: '000000' },
  hh: { slug: 'ubisoft', color: '000000' },
  bz: { slug: 'battlenet', color: '148EFF' },
  // Стриминг
  nf: { slug: 'netflix', color: 'E50914' },
  alj: { slug: 'spotify', color: '1DB954' },
  // Путешествия
  uk: { slug: 'airbnb', color: 'FF5A5F' },
  ag: { slug: 'agoda', color: '5392F9' },
  // Прочее
  tl: { slug: 'truecaller', color: '1DAE52' },
  cn: { slug: 'fiverr', color: '1DBF73' },
  zh: { slug: 'zoho', color: 'C8202B' },
};

interface ServiceLogoProps {
  serviceCode: string;
  fallbackEmoji?: string;
  className?: string;
}

export const ServiceLogo = ({ serviceCode, fallbackEmoji = '📱', className }: ServiceLogoProps) => {
  const [imgError, setImgError] = useState(false);
  const logoInfo = LOGO_MAP[serviceCode];

  if (!logoInfo || imgError) {
    return (
      <span className={cn("text-base flex-shrink-0 w-5 h-5 flex items-center justify-center", className)}>
        {fallbackEmoji}
      </span>
    );
  }

  return (
    <img
      src={`https://cdn.simpleicons.org/${logoInfo.slug}/${logoInfo.color}`}
      alt={serviceCode}
      onError={() => setImgError(true)}
      className={cn("w-5 h-5 flex-shrink-0 object-contain", className)}
      loading="lazy"
    />
  );
};
