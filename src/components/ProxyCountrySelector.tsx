import { Loader2 } from 'lucide-react';
import { CountryFlag } from './CountryFlags';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Expanded country name mapping
const countryNames: Record<string, string> = {
  al: 'Албания', am: 'Армения', ar: 'Аргентина', at: 'Австрия', au: 'Австралия',
  az: 'Азербайджан', ba: 'Босния и Герцеговина', bd: 'Бангладеш', be: 'Бельгия',
  bg: 'Болгария', br: 'Бразилия', by: 'Беларусь', ca: 'Канада', ch: 'Швейцария',
  cl: 'Чили', cn: 'Китай', co: 'Колумбия', cr: 'Коста-Рика', cy: 'Кипр',
  cz: 'Чехия', de: 'Германия', dk: 'Дания', ec: 'Эквадор', ee: 'Эстония',
  eg: 'Египет', es: 'Испания', fi: 'Финляндия', fr: 'Франция', ge: 'Грузия',
  gb: 'Великобритания', gh: 'Гана', gr: 'Греция', hk: 'Гонконг', hr: 'Хорватия',
  hu: 'Венгрия', id: 'Индонезия', ie: 'Ирландия', il: 'Израиль', in: 'Индия',
  ir: 'Иран', is: 'Исландия', it: 'Италия', jp: 'Япония', ke: 'Кения',
  kg: 'Кыргызстан', kr: 'Южная Корея', kw: 'Кувейт', kz: 'Казахстан',
  lt: 'Литва', lu: 'Люксембург', lv: 'Латвия', md: 'Молдова', me: 'Черногория',
  mk: 'Северная Македония', mn: 'Монголия', mx: 'Мексика', my: 'Малайзия',
  ng: 'Нигерия', nl: 'Нидерланды', no: 'Норвегия', nz: 'Новая Зеландия',
  pa: 'Панама', pe: 'Перу', ph: 'Филиппины', pk: 'Пакистан', pl: 'Польша',
  pt: 'Португалия', ro: 'Румыния', rs: 'Сербия', ru: 'Россия', sa: 'Саудовская Аравия',
  se: 'Швеция', sg: 'Сингапур', si: 'Словения', sk: 'Словакия', th: 'Таиланд',
  tj: 'Таджикистан', tm: 'Туркменистан', tr: 'Турция', tw: 'Тайвань',
  ua: 'Украина', us: 'США', uz: 'Узбекистан', ve: 'Венесуэла', vn: 'Вьетнам',
  za: 'ЮАР',
};

const getCountryName = (code: string) => countryNames[code.toLowerCase()] || code.toUpperCase();

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
  if (isLoading) {
    return (
      <div className="space-y-2">
        <label className="text-sm font-medium">Выберите страну</label>
        <div className="flex items-center py-4 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
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
    <div className="space-y-2">
      <label className="text-sm font-medium">Выберите страну</label>
      <Select value={selectedCountry || ''} onValueChange={onSelect}>
        <SelectTrigger>
          <SelectValue placeholder="Выберите страну...">
            {selectedCountry && (
              <div className="flex items-center gap-2">
                <CountryFlag countryCode={selectedCountry} className="h-4 w-6" />
                <span>{getCountryName(selectedCountry)}</span>
                <span className="text-xs text-muted-foreground ml-auto">
                  ({availability[selectedCountry] || 0} шт)
                </span>
              </div>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="max-h-[300px]">
          {sortedCountries.map((code) => {
            const count = availability[code] || 0;
            const isAvailable = count > 0;

            return (
              <SelectItem
                key={code}
                value={code}
                disabled={!isAvailable}
                className="cursor-pointer"
              >
                <div className="flex items-center gap-2 w-full">
                  <CountryFlag countryCode={code} className="h-4 w-6" />
                  <span>{getCountryName(code)}</span>
                  <span className={`text-xs ml-auto ${isAvailable ? 'text-muted-foreground' : 'text-destructive'}`}>
                    {isAvailable ? `${count} шт` : 'нет'}
                  </span>
                </div>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    </div>
  );
};
