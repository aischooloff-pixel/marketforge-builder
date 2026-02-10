import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Loader2 } from 'lucide-react';
import { CountryFlag } from './CountryFlags';

// Country name mapping
const countryNames: Record<string, string> = {
  ru: 'Россия', us: 'США', gb: 'Великобритания', de: 'Германия',
  fr: 'Франция', nl: 'Нидерланды', pl: 'Польша', ua: 'Украина',
  kz: 'Казахстан', tr: 'Турция', jp: 'Япония', sg: 'Сингапур',
  au: 'Австралия', ca: 'Канада', it: 'Италия', es: 'Испания',
  br: 'Бразилия', in: 'Индия', kr: 'Южная Корея', hk: 'Гонконг',
  ee: 'Эстония',
};

interface ProxyCountrySelectorProps {
  countries: string[];
  availability: Record<string, number>;
  selectedCountry: string | null;
  onSelect: (code: string) => void;
  isLoading?: boolean;
}

export const ProxyCountrySelector = ({
  countries,
  availability,
  selectedCountry,
  onSelect,
  isLoading,
}: ProxyCountrySelectorProps) => {
  const [hoveredCountry, setHoveredCountry] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="space-y-3">
        <label className="text-sm font-medium">Выберите страну</label>
        <div className="flex items-center justify-center py-8 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-2" />
          Загрузка стран...
        </div>
      </div>
    );
  }

  // Sort: available first (by count desc), then unavailable
  const sortedCountries = [...countries].sort((a, b) => {
    const aCount = availability[a] || 0;
    const bCount = availability[b] || 0;
    if (aCount === 0 && bCount > 0) return 1;
    if (aCount > 0 && bCount === 0) return -1;
    return bCount - aCount;
  });

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium">Выберите страну</label>
      <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2 relative">
        {sortedCountries.map((code) => {
          const count = availability[code] || 0;
          const isAvailable = count > 0;
          const isSelected = selectedCountry === code;

          return (
            <motion.button
              key={code}
              onClick={() => isAvailable && onSelect(code)}
              onMouseEnter={() => setHoveredCountry(code)}
              onMouseLeave={() => setHoveredCountry(null)}
              whileHover={isAvailable ? { scale: 1.1 } : {}}
              whileTap={isAvailable ? { scale: 0.95 } : {}}
              className={`relative p-3 rounded-lg border transition-all ${
                isSelected
                  ? 'border-foreground bg-secondary'
                  : isAvailable
                    ? 'border-border hover:border-foreground/50'
                    : 'border-border opacity-40 cursor-not-allowed'
              }`}
              disabled={!isAvailable}
            >
              <div className="flex flex-col items-center gap-1">
                <CountryFlag countryCode={code} className="h-6 w-9" />
                <span className="text-[10px] font-semibold text-muted-foreground">
                  {code.toUpperCase()}
                </span>
              </div>

              {/* Stock badge */}
              <div className={`absolute -bottom-1 left-1/2 -translate-x-1/2 text-[9px] px-1.5 rounded-full font-medium ${
                isAvailable
                  ? count <= 5
                    ? 'bg-orange-500/20 text-orange-600'
                    : 'bg-green-500/20 text-green-600'
                  : 'bg-destructive/20 text-destructive'
              }`}>
                {isAvailable ? count : '0'}
              </div>

              {isSelected && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-foreground text-background flex items-center justify-center"
                >
                  <Check className="h-3 w-3" />
                </motion.div>
              )}

              {/* Tooltip */}
              <AnimatePresence>
                {hoveredCountry === code && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.9 }}
                    transition={{ duration: 0.15 }}
                    className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 pointer-events-none"
                  >
                    <div className="bg-popover border rounded-lg shadow-lg p-3 whitespace-nowrap">
                      <p className="font-medium text-sm">{countryNames[code] || code.toUpperCase()}</p>
                      <p className={`text-xs mt-1 ${isAvailable ? 'text-green-600' : 'text-destructive'}`}>
                        {isAvailable ? `Доступно: ${count} шт` : 'Нет в наличии'}
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>
          );
        })}
      </div>

      {selectedCountry && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 p-3 rounded-lg bg-secondary"
        >
          <CountryFlag countryCode={selectedCountry} className="h-5 w-7" />
          <span className="font-medium">
            {countryNames[selectedCountry] || selectedCountry.toUpperCase()}
          </span>
          <span className="text-sm text-muted-foreground ml-auto">
            Доступно: {availability[selectedCountry] || 0} шт
          </span>
        </motion.div>
      )}
    </div>
  );
};
