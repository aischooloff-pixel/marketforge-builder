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
  fu: { slug: 'signal', color: '3A76F0' },
  qq: { slug: 'tencentqq', color: 'EB1923' },
  kt: { slug: 'kakaotalk', color: 'FAE100' },
  // Соцсети
  ig: { slug: 'instagram', color: 'E4405F' },
  lf: { slug: 'tiktok', color: '000000' },
  tw: { slug: 'x', color: '000000' },
  fb: { slug: 'facebook', color: '0866FF' },
  ew: { slug: 'youtube', color: 'FF0000' },
  hb: { slug: 'twitch', color: '9146FF' },
  kc: { slug: 'vinted', color: '09B1BA' },
  kf: { slug: 'sinaweibo', color: 'E6162D' },
  sn: { slug: 'snapchat', color: 'FFFC00' },
  pm: { slug: 'pinterest', color: 'BD081C' },
  la: { slug: 'linkedin', color: '0A66C2' },
  rd: { slug: 'reddit', color: 'FF4500' },
  // Почта и облако
  go: { slug: 'google', color: '4285F4' },
  ya: { slug: 'yandex', color: 'FF0000' },
  mb: { slug: 'microsoft', color: '5E5E5E' },
  ma: { slug: 'maildotru', color: '005FF9' },
  dp: { slug: 'openai', color: '412991' },
  wx: { slug: 'apple', color: '000000' },
  // Маркетплейсы
  am: { slug: 'amazon', color: 'FF9900' },
  uu: { slug: 'wildberries', color: 'A73AFF' },
  xd: { slug: 'tokopedia', color: '42B549' },
  pr: { slug: 'trendyol', color: 'F27A1A' },
  ju: { slug: 'shopee', color: 'EE4D2D' },
  an: { slug: 'adidas', color: '000000' },
  // Транспорт
  ub: { slug: 'uber', color: '000000' },
  rl: { slug: 'bolt', color: '34D186' },
  dg: { slug: 'didi', color: 'FF7A13' },
  ly: { slug: 'lyft', color: 'FF00BF' },
  // Доставка
  rr: { slug: 'wolt', color: '009DE0' },
  // Финансы
  nz: { slug: 'binance', color: 'F0B90B' },
  gc: { slug: 'tradingview', color: '131722' },
  bo: { slug: 'wise', color: '9FE870' },
  ts: { slug: 'paypal', color: '003087' },
  ij: { slug: 'revolut', color: '0075EB' },
  nc: { slug: 'payoneer', color: 'FF4800' },
  // Дейтинг
  oi: { slug: 'tinder', color: 'FF6B6B' },
  yx: { slug: 'bumble', color: 'FAC515' },
  bv: { slug: 'badoo', color: '783BF9' },
  // Игры
  gm: { slug: 'steam', color: '000000' },
  ep: { slug: 'epicgames', color: '313131' },
  hh: { slug: 'ubisoft', color: '000000' },
  lq: { slug: 'roblox', color: '000000' },
  // Стриминг
  be: { slug: 'netflix', color: 'E50914' },
  bk: { slug: 'spotify', color: '1DB954' },
  // Путешествия
  qx: { slug: 'bookingdotcom', color: '003580' },
  // Прочее
  tl: { slug: 'truecaller', color: '1DAE52' },
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
