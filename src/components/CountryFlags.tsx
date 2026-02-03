import { cn } from '@/lib/utils';

interface FlagProps {
  className?: string;
}

// Using flagcdn.com for high-quality SVG flags
export const CountryFlag = ({ 
  countryCode, 
  className 
}: { 
  countryCode: string; 
  className?: string;
}) => {
  return (
    <img 
      src={`https://flagcdn.com/w40/${countryCode.toLowerCase()}.png`}
      srcSet={`https://flagcdn.com/w80/${countryCode.toLowerCase()}.png 2x`}
      alt={countryCode}
      className={cn("h-5 w-7 object-cover rounded-sm", className)}
    />
  );
};

export const CountryFlagWithCode = ({ 
  countryCode, 
  className 
}: { 
  countryCode: string; 
  className?: string;
}) => {
  return (
    <div className={cn("flex flex-col items-center gap-1", className)}>
      <img 
        src={`https://flagcdn.com/w40/${countryCode.toLowerCase()}.png`}
        srcSet={`https://flagcdn.com/w80/${countryCode.toLowerCase()}.png 2x`}
        alt={countryCode}
        className="h-6 w-9 object-cover rounded-sm shadow-sm"
      />
      <span className="text-[10px] font-medium text-muted-foreground">{countryCode}</span>
    </div>
  );
};
