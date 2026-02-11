import { useState } from 'react';
import { useTigerPrices, useBuyNumber, TIGER_SERVICES, TIGER_COUNTRIES } from '@/hooks/useTigerSms';
import { useTelegram } from '@/contexts/TelegramContext';
import { CountryFlag } from '@/components/CountryFlags';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, ShoppingCart, Phone, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

export const TigerNumberBuyer = () => {
  const { user } = useTelegram();
  const navigate = useNavigate();
  const [selectedService, setSelectedService] = useState('');
  const [selectedCountry, setSelectedCountry] = useState('');
  const buyNumber = useBuyNumber();

  const { data: pricesData, isLoading: pricesLoading } = useTigerPrices(
    selectedService || undefined
  );

  // Prices come as { country_code: { service_code: { cost, count } } }
  const getPrice = (): { price: number; count: number } | null => {
    if (!pricesData || !selectedService || !selectedCountry) return null;
    const countryData = pricesData[selectedCountry];
    if (!countryData) return null;
    const serviceData = countryData[selectedService];
    if (!serviceData) return null;
    return { price: Math.ceil(parseFloat(serviceData.cost)), count: serviceData.count };
  };

  const priceInfo = getPrice();
  const serviceInfo = TIGER_SERVICES.find(s => s.code === selectedService);
  const countryInfo = TIGER_COUNTRIES.find(c => c.code === selectedCountry);

  const handleBuy = async () => {
    if (!user || !selectedService || !selectedCountry || !priceInfo) return;

    if (user.balance < priceInfo.price) {
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
        price: priceInfo.price,
      },
      {
        onSuccess: (data) => {
          toast.success(
            `Номер получен: +${data.phoneNumber}`,
            { description: 'Перейдите в "Номера" в профиле для приёма SMS' }
          );
          navigate('/profile');
        },
        onError: (err) => {
          toast.error(err.message);
        },
      }
    );
  };

  // Get available countries for selected service from prices data
  const availableCountries = selectedService && pricesData
    ? TIGER_COUNTRIES.filter(c => {
        const countryData = pricesData[c.code];
        if (!countryData) return false;
        const serviceData = countryData[selectedService];
        return serviceData && serviceData.count > 0;
      }).sort((a, b) => {
        const aPrice = parseFloat(pricesData[a.code]?.[selectedService]?.cost || '999');
        const bPrice = parseFloat(pricesData[b.code]?.[selectedService]?.cost || '999');
        return aPrice - bPrice;
      })
    : [];

  // Also add countries from pricesData that we don't have in our static list
  const extraCountries = selectedService && pricesData
    ? Object.keys(pricesData)
        .filter(code => {
          const serviceData = pricesData[code]?.[selectedService];
          return serviceData && serviceData.count > 0 && !TIGER_COUNTRIES.find(c => c.code === code);
        })
        .map(code => ({ code, name: `Страна #${code}`, flag: '' }))
    : [];

  const allCountries = [...availableCountries, ...extraCountries];

  return (
    <div className="space-y-4">
      {/* Service Selector */}
      <div>
        <label className="text-sm font-medium mb-2 block flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          Сервис
        </label>
        <Select value={selectedService} onValueChange={(v) => { setSelectedService(v); setSelectedCountry(''); }}>
          <SelectTrigger>
            <SelectValue placeholder="Выберите сервис..." />
          </SelectTrigger>
          <SelectContent className="max-h-[300px]">
            {TIGER_SERVICES.map(s => (
              <SelectItem key={s.code} value={s.code}>
                <span className="flex items-center gap-2">
                  <span>{s.icon}</span>
                  <span>{s.name}</span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Country Selector */}
      {selectedService && (
        <div>
          <label className="text-sm font-medium mb-2 block flex items-center gap-2">
            <Phone className="h-4 w-4" />
            Страна
          </label>
          {pricesLoading ? (
            <div className="flex items-center gap-2 py-3 text-muted-foreground text-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
              Загрузка стран и цен...
            </div>
          ) : (
            <Select value={selectedCountry} onValueChange={setSelectedCountry}>
              <SelectTrigger>
                <SelectValue placeholder="Выберите страну...">
                  {selectedCountry && countryInfo && (
                    <div className="flex items-center gap-2">
                      {countryInfo.flag && <CountryFlag countryCode={countryInfo.flag} className="h-4 w-6" />}
                      <span>{countryInfo.name}</span>
                    </div>
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                {allCountries.length === 0 ? (
                  <div className="p-3 text-sm text-muted-foreground text-center">
                    Нет доступных стран для этого сервиса
                  </div>
                ) : (
                  allCountries.map(c => {
                    const info = pricesData?.[c.code]?.[selectedService];
                    const price = info ? Math.ceil(parseFloat(info.cost)) : 0;
                    return (
                      <SelectItem key={c.code} value={c.code}>
                        <div className="flex items-center gap-2 w-full">
                          {c.flag && <CountryFlag countryCode={c.flag} className="h-4 w-6" />}
                          <span className="flex-1">{c.name}</span>
                          <span className="text-xs text-muted-foreground ml-2">
                            {price} ₽ · {info?.count} шт
                          </span>
                        </div>
                      </SelectItem>
                    );
                  })
                )}
              </SelectContent>
            </Select>
          )}
        </div>
      )}

      {/* Price Display */}
      {priceInfo && (
        <div className="p-3 rounded-lg bg-secondary/50 border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Стоимость номера</p>
              <p className="text-2xl font-bold">{priceInfo.price} <span className="text-lg text-muted-foreground">₽</span></p>
            </div>
            <Badge variant="outline" className="text-xs">
              Доступно: {priceInfo.count}
            </Badge>
          </div>
        </div>
      )}

      {/* Buy Button */}
      <Button
        size="lg"
        className="w-full gap-2"
        disabled={!selectedService || !selectedCountry || !priceInfo || priceInfo.count === 0 || buyNumber.isPending}
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
            {priceInfo ? `Купить за ${priceInfo.price} ₽` : 'Выберите сервис и страну'}
          </>
        )}
      </Button>

      <p className="text-xs text-muted-foreground text-center">
        После покупки номер и SMS-код будут доступны в разделе «Номера» вашего профиля
      </p>
    </div>
  );
};
