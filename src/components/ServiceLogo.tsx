import { cn } from '@/lib/utils';
import { useState } from 'react';

// Map Tiger SMS service codes to Simple Icons slugs
const LOGO_MAP: Record<string, { slug: string; color: string }> = {
  tg: { slug: 'telegram', color: '26A5E4' },
  wa: { slug: 'whatsapp', color: '25D366' },
  vi: { slug: 'viber', color: '7360F2' },
  wb: { slug: 'wechat', color: '07C160' },
  ds: { slug: 'discord', color: '5865F2' },
  me: { slug: 'line', color: '00C300' },
  fu: { slug: 'signal', color: '3A76F0' },
  ig: { slug: 'instagram', color: 'E4405F' },
  lf: { slug: 'tiktok', color: '000000' },
  tw: { slug: 'x', color: '000000' },
  fb: { slug: 'facebook', color: '0866FF' },
  ew: { slug: 'youtube', color: 'FF0000' },
  hb: { slug: 'twitch', color: '9146FF' },
  sn: { slug: 'snapchat', color: 'FFFC00' },
  pm: { slug: 'pinterest', color: 'BD081C' },
  kt: { slug: 'kakaotalk', color: 'FAE100' },
  la: { slug: 'linkedin', color: '0A66C2' },
  rd: { slug: 'reddit', color: 'FF4500' },
  go: { slug: 'google', color: '4285F4' },
  ya: { slug: 'yandex', color: 'FF0000' }, 
  mb: { slug: 'microsoft', color: '5E5E5E' },
  ma: { slug: 'apple', color: '000000' },
  am: { slug: 'amazon', color: 'FF9900' },
  ub: { slug: 'uber', color: '000000' },
  nz: { slug: 'binance', color: 'F0B90B' },
  gm: { slug: 'steam', color: '000000' },
  ep: { slug: 'epicgames', color: '313131' },
  be: { slug: 'netflix', color: 'E50914' },
  bk: { slug: 'spotify', color: '1DB954' },
  dp: { slug: 'openai', color: '412991' },
  qn: { slug: 'paypal', color: '003087' },
  ky: { slug: 'revolut', color: '0075EB' },
  oi: { slug: 'tinder', color: 'FF6B6B' },
  yx: { slug: 'bumble', color: 'FAC515' },
  bv: { slug: 'badoo', color: '783BF9' },
  ly: { slug: 'lyft', color: 'FF00BF' },
  dg: { slug: 'didi', color: 'FF7A13' },
  lq: { slug: 'roblox', color: '000000' },
  bo: { slug: 'wise', color: '9FE870' },
  rl: { slug: 'bolt', color: '34D186' },
  fx: { slug: 'bybit', color: 'F7A600' },
  eo: { slug: 'okx', color: '000000' },
  kc: { slug: 'vinted', color: '09B1BA' },
  ju: { slug: 'shopee', color: 'EE4D2D' },
  qx: { slug: 'bookingdotcom', color: '003580' },
  qq: { slug: 'tencentqq', color: 'EB1923' },
  gc: { slug: 'tradingview', color: '131722' },
  mm: { slug: 'maildotru', color: '005FF9' },
  tl: { slug: 'truecaller', color: '1DAE52' },
  pj: { slug: 'payoneer', color: 'FF4800' },
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
