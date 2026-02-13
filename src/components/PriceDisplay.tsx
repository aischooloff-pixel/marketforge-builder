import { useExchangeRate, rubToUsd, formatUsd } from '@/hooks/useExchangeRate';

interface PriceDisplayProps {
  priceRub: number;
  /** Main price text size class, e.g. "text-3xl" */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  suffix?: string;
  className?: string;
}

const sizeClasses = {
  sm: { main: 'text-sm font-bold', symbol: 'text-xs', rub: 'text-[10px]' },
  md: { main: 'text-base md:text-2xl font-bold', symbol: 'text-xs md:text-sm', rub: 'text-[10px] md:text-xs' },
  lg: { main: 'text-2xl md:text-3xl font-bold', symbol: 'text-sm md:text-lg', rub: 'text-xs' },
  xl: { main: 'text-3xl md:text-4xl font-bold', symbol: 'text-lg md:text-xl', rub: 'text-xs md:text-sm' },
};

export const PriceDisplay = ({ priceRub, size = 'md', suffix, className = '' }: PriceDisplayProps) => {
  const { data: rate = 90 } = useExchangeRate();
  const usd = rubToUsd(priceRub, rate);
  const rubRounded = Math.round(priceRub);
  const s = sizeClasses[size];

  return (
    <div className={`flex items-baseline gap-1.5 flex-wrap ${className}`}>
      <span className={s.main}>
        {formatUsd(usd)}
      </span>
      <span className={`${s.symbol} text-muted-foreground`}>$</span>
      {suffix && <span className="text-muted-foreground text-sm">{suffix}</span>}
      <span className={`${s.rub} text-muted-foreground`}>
        {rubRounded.toLocaleString('ru-RU')} ₽
      </span>
    </div>
  );
};

/** Inline price for compact lists */
export const PriceInline = ({ priceRub, className = '' }: { priceRub: number; className?: string }) => {
  const { data: rate = 90 } = useExchangeRate();
  const usd = rubToUsd(priceRub, rate);
  const rubRounded = Math.round(priceRub);

  return (
    <span className={className}>
      <span className="font-bold">{formatUsd(usd)} $</span>
      <span className="text-muted-foreground text-xs ml-1">{rubRounded.toLocaleString('ru-RU')} ₽</span>
    </span>
  );
};
