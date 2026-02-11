import { useState, useMemo } from 'react';
import { useTigerPrices, useBuyNumber, TIGER_SERVICES, getServiceByCode, getCountryByCode } from '@/hooks/useTigerSms';
import { useTelegram } from '@/contexts/TelegramContext';
import { CountryFlag } from '@/components/CountryFlags';
import { ServiceLogo } from '@/components/ServiceLogo';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, ShoppingCart, Phone, MessageSquare, Search, Check } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

export const TigerNumberBuyer = () => {
  const { user } = useTelegram();
  const navigate = useNavigate();
  const [selectedService, setSelectedService] = useState('');
  const [selectedCountry, setSelectedCountry] = useState('');
  const [serviceSearch, setServiceSearch] = useState('');
  const [countrySearch, setCountrySearch] = useState('');
  const buyNumber = useBuyNumber();

  const { data: pricesData, isLoading: pricesLoading } = useTigerPrices(
    selectedService || undefined
  );

  // Filter services by search — normalize input
  const filteredServices = useMemo(() => {
    const q = serviceSearch.toLowerCase().trim();
    if (!q) return TIGER_SERVICES;
    return TIGER_SERVICES.filter(s => {
      const name = s.name.toLowerCase();
      // Search by name parts (split by / for combined names like "TikTok/Douyin")
      const nameParts = name.split(/[\s\/]+/);
      return nameParts.some(part => part.startsWith(q)) || name.includes(q) || s.code.toLowerCase().includes(q);
    });
  }, [serviceSearch]);

  // Get available countries for selected service from prices data
  const availableCountries = useMemo(() => {
    if (!selectedService || !pricesData) return [];

    const entries = Object.entries(pricesData)
      .filter(([, serviceMap]) => {
        const serviceData = serviceMap[selectedService];
        return serviceData && serviceData.count > 0;
      })
      .map(([code, serviceMap]) => {
        const known = getCountryByCode(code);
        const serviceData = serviceMap[selectedService];
        return {
          code,
          name: known?.name || `Страна #${code}`,
          flag: known?.flag || '',
          price: parseFloat(serviceData.cost),
          count: serviceData.count,
        };
      })
      .sort((a, b) => a.price - b.price);

    return entries;
  }, [selectedService, pricesData]);

  // Filter countries by search
  const filteredCountries = useMemo(() => {
    const q = countrySearch.toLowerCase().trim();
    if (!q) return availableCountries;
    return availableCountries.filter(c =>
      c.name.toLowerCase().includes(q) || c.code.includes(q)
    );
  }, [countrySearch, availableCountries]);

  // Get price for selected combination
  const selectedCountryData = availableCountries.find(c => c.code === selectedCountry);
  const serviceInfo = getServiceByCode(selectedService);
  const countryInfo = getCountryByCode(selectedCountry);

  const handleBuy = async () => {
    if (!user || !selectedService || !selectedCountry || !selectedCountryData) return;

    if (user.balance < selectedCountryData.price) {
      toast.error('Недостаточно средств на балансе');
      return;
    }

    buyNumber.mutate(
      {
        service: selectedService,
        serviceName: serviceInfo?.name || selectedService,
        country: selectedCountry,
        countryName: countryInfo?.name || selectedCountry,
        userId: user.id,
        price: selectedCountryData.price,
      },
      {
        onSuccess: (data) => {
          toast.success(
            `Номер получен: +${data.phoneNumber}`,
            { description: 'Перейдите в "Номера" в профиле для приёма SMS' }
          );
          navigate('/profile?tab=numbers');
        },
        onError: (err) => {
          toast.error(err.message);
        },
      }
    );
  };

  return (
    <div className="space-y-4">
      {/* ── Service Selector ── */}
      <div>
        <label className="text-sm font-medium mb-2 block flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          Сервис
        </label>
        <div className="relative mb-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Поиск сервиса..."
            value={serviceSearch}
            onChange={(e) => setServiceSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        <ScrollArea className="h-[200px] rounded-lg border bg-card">
          <div className="p-1">
            {filteredServices.map(s => (
              <button
                key={s.code}
                onClick={() => {
                  setSelectedService(s.code);
                  setSelectedCountry('');
                  setCountrySearch('');
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors text-left ${
                  selectedService === s.code
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-secondary'
                }`}
              >
                <ServiceLogo serviceCode={s.code} fallbackEmoji={s.icon} className="flex-shrink-0" />
                <span className="flex-1 truncate">{s.name}</span>
                {selectedService === s.code && <Check className="h-4 w-4 flex-shrink-0" />}
              </button>
            ))}
            {filteredServices.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Сервис не найден
              </p>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* ── Country Selector ── */}
      <AnimatePresence>
        {selectedService && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <label className="text-sm font-medium mb-2 block flex items-center gap-2">
              <Phone className="h-4 w-4" />
              Страна
              {!pricesLoading && availableCountries.length > 0 && (
                <span className="text-xs text-muted-foreground font-normal">
                  ({availableCountries.length} доступно)
                </span>
              )}
            </label>

            {pricesLoading ? (
              <div className="flex items-center gap-2 py-6 text-muted-foreground text-sm justify-center">
                <Loader2 className="h-4 w-4 animate-spin" />
                Загрузка стран и цен...
              </div>
            ) : (
              <>
                <div className="relative mb-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Поиск страны..."
                    value={countrySearch}
                    onChange={(e) => setCountrySearch(e.target.value)}
                    className="pl-9 h-9"
                  />
                </div>
                <ScrollArea className="h-[220px] rounded-lg border bg-card">
                  <div className="p-1">
                    {filteredCountries.map(c => (
                      <button
                        key={c.code}
                        onClick={() => setSelectedCountry(c.code)}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors text-left ${
                          selectedCountry === c.code
                            ? 'bg-primary text-primary-foreground'
                            : 'hover:bg-secondary'
                        }`}
                      >
                        {c.flag ? (
                          <CountryFlag countryCode={c.flag} className="h-4 w-5 flex-shrink-0" />
                        ) : (
                          <span className="w-5 text-center text-xs">🌍</span>
                        )}
                        <span className="flex-1 truncate">{c.name}</span>
                        <span className={`text-xs flex-shrink-0 ${
                          selectedCountry === c.code ? 'text-primary-foreground/80' : 'text-muted-foreground'
                        }`}>
                          {c.price.toFixed(2)} ₽ · {c.count} шт
                        </span>
                        {selectedCountry === c.code && <Check className="h-4 w-4 flex-shrink-0" />}
                      </button>
                    ))}
                    {filteredCountries.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        {availableCountries.length === 0
                          ? 'Нет доступных стран для этого сервиса'
                          : 'Страна не найдена'}
                      </p>
                    )}
                  </div>
                </ScrollArea>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Price Display ── */}
      <AnimatePresence>
        {selectedCountryData && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3 rounded-lg bg-secondary/50 border"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Стоимость номера</p>
                <p className="text-2xl font-bold">
                  {selectedCountryData.price.toFixed(2)} <span className="text-lg text-muted-foreground">₽</span>
                </p>
              </div>
              <div className="text-right">
                <Badge variant="outline" className="text-xs mb-1">
                  {selectedCountryData.count} шт
                </Badge>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground justify-end">
                  <ServiceLogo serviceCode={selectedService} fallbackEmoji={serviceInfo?.icon} className="w-3.5 h-3.5" />
                  {serviceInfo?.name} · {countryInfo?.name || `#${selectedCountry}`}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Buy Button ── */}
      <Button
        size="lg"
        className="w-full gap-2"
        disabled={!selectedService || !selectedCountry || !selectedCountryData || selectedCountryData.count === 0 || buyNumber.isPending}
        onClick={handleBuy}
      >
        {buyNumber.isPending ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            Получаем номер...
          </>
        ) : (
          <>
            <ShoppingCart className="h-5 w-5" />
            {selectedCountryData ? `Купить за ${selectedCountryData.price.toFixed(2)} ₽` : 'Выберите сервис и страну'}
          </>
        )}
      </Button>

      <p className="text-xs text-muted-foreground text-center">
        После покупки номер и SMS-код будут доступны в разделе «Номера» вашего профиля
      </p>
    </div>
  );
};
