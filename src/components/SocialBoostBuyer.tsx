import { useState, useMemo } from 'react';
import { useProfiServices, useProfiCategories, useCreateBoostOrder, type ProfiService } from '@/hooks/useProfiLike';
import { useTelegram } from '@/contexts/TelegramContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, ShoppingCart, Search, Check, Link2, Hash, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

// Social network icons
const SOCIAL_ICONS: Record<string, string> = {
  Instagram: '📸',
  YouTube: '▶️',
  TikTok: '🎵',
  Telegram: '✈️',
  Twitter: '🐦',
  Facebook: '👤',
  VK: '🔵',
  'VK Play': '🎮',
  Discord: '💬',
  Spotify: '🎧',
  SoundCloud: '🔊',
  Twitch: '🟣',
  Likee: '❤️',
  Pinterest: '📌',
  LinkedIn: '💼',
  Snapchat: '👻',
  Reddit: '🤖',
  Clubhouse: '🏠',
  Kick: '🟢',
  Threads: '🧵',
  OK: '🟠',
  Yandex: '🔍',
  'Google Maps': '📍',
  Shazam: '🎶',
  Rumble: '📺',
  'Apple Music': '🍎',
  Deezer: '🎵',
};

export const SocialBoostBuyer = () => {
  const { user, refreshUser } = useTelegram();
  const { data: services, isLoading: servicesLoading } = useProfiServices();
  const categories = useProfiCategories(services);
  const createOrder = useCreateBoostOrder();

  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedService, setSelectedService] = useState<ProfiService | null>(null);
  const [link, setLink] = useState('');
  const [quantity, setQuantity] = useState('');
  const [categorySearch, setCategorySearch] = useState('');
  const [serviceSearch, setServiceSearch] = useState('');

  // Filter categories
  const filteredCategories = useMemo(() => {
    const q = categorySearch.toLowerCase().trim();
    if (!q) return categories;
    return categories.filter((c) => c.toLowerCase().includes(q));
  }, [categories, categorySearch]);

  // Get services for selected category
  const categoryServices = useMemo(() => {
    if (!selectedCategory || !services) return [];
    return services.filter((s) => s.category === selectedCategory);
  }, [selectedCategory, services]);

  // Filter services
  const filteredServices = useMemo(() => {
    const q = serviceSearch.toLowerCase().trim();
    if (!q) return categoryServices;
    return categoryServices.filter((s) => s.name.toLowerCase().includes(q));
  }, [categoryServices, serviceSearch]);

  // Calculate price
  const rate = selectedService ? parseFloat(selectedService.rate) : 0;
  const qty = parseInt(quantity) || 0;
  const calculatedPrice = Math.ceil((rate * qty / 1000) * 100) / 100;
  const isValidQuantity = selectedService
    ? qty >= selectedService.min && qty <= selectedService.max
    : false;

  const handleBuy = async () => {
    if (!user || !selectedService || !link.trim() || !isValidQuantity) return;

    if (user.balance < calculatedPrice) {
      toast.error('Недостаточно средств на балансе');
      return;
    }

    createOrder.mutate(
      {
        serviceId: selectedService.service,
        serviceName: selectedService.name,
        category: selectedCategory,
        link: link.trim(),
        quantity: qty,
        rate,
        userId: user.id,
      },
      {
        onSuccess: (data) => {
          toast.success('Заказ на накрутку создан!', {
            description: `Заказ #${data.orderId} — ${calculatedPrice} ₽`,
          });
          // Reset form
          setSelectedService(null);
          setLink('');
          setQuantity('');
          // Refresh user balance
          refreshUser();
        },
        onError: (err) => {
          toast.error(err.message);
        },
      }
    );
  };

  if (servicesLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Загрузка сервисов...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ── Social Network Selector ── */}
      <div>
        <label className="text-sm font-medium mb-2 flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          Соц. сеть
        </label>
        <div className="relative mb-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Поиск соц. сети..."
            value={categorySearch}
            onChange={(e) => setCategorySearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        <ScrollArea className="h-[180px] rounded-lg border bg-card">
          <div className="p-1">
            {filteredCategories.map((cat) => (
              <button
                key={cat}
                onClick={() => {
                  setSelectedCategory(cat);
                  setSelectedService(null);
                  setServiceSearch('');
                  setLink('');
                  setQuantity('');
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors text-left ${
                  selectedCategory === cat
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-secondary'
                }`}
              >
                <span className="text-base flex-shrink-0">{SOCIAL_ICONS[cat] || '📱'}</span>
                <span className="flex-1 truncate">{cat}</span>
                {selectedCategory === cat && <Check className="h-4 w-4 flex-shrink-0" />}
              </button>
            ))}
            {filteredCategories.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">Не найдено</p>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* ── Service Selector ── */}
      <AnimatePresence>
        {selectedCategory && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <label className="text-sm font-medium mb-2 flex items-center gap-2">
              <Hash className="h-4 w-4" />
              Услуга
              <span className="text-xs text-muted-foreground font-normal">
                ({categoryServices.length} доступно)
              </span>
            </label>
            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Поиск услуги..."
                value={serviceSearch}
                onChange={(e) => setServiceSearch(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
            <ScrollArea className="h-[200px] rounded-lg border bg-card">
              <div className="p-1">
                {filteredServices.map((s) => (
                  <button
                    key={s.service}
                    onClick={() => {
                      setSelectedService(s);
                      setQuantity(s.min.toString());
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors text-left ${
                      selectedService?.service === s.service
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-secondary'
                    }`}
                  >
                    <span className="flex-1 truncate">{s.name}</span>
                    <span
                      className={`text-xs flex-shrink-0 ${
                        selectedService?.service === s.service
                          ? 'text-primary-foreground/80'
                          : 'text-muted-foreground'
                      }`}
                    >
                      {s.rate} ₽/1K
                    </span>
                    {selectedService?.service === s.service && (
                      <Check className="h-4 w-4 flex-shrink-0" />
                    )}
                  </button>
                ))}
                {filteredServices.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">Услуга не найдена</p>
                )}
              </div>
            </ScrollArea>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Link & Quantity ── */}
      <AnimatePresence>
        {selectedService && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-3"
          >
            <div>
              <label className="text-sm font-medium mb-1.5 flex items-center gap-2">
                <Link2 className="h-4 w-4" />
                Ссылка
              </label>
              <Input
                placeholder="https://instagram.com/username"
                value={link}
                onChange={(e) => setLink(e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 flex items-center gap-2">
                <Hash className="h-4 w-4" />
                Количество
                <span className="text-xs text-muted-foreground font-normal">
                  (мин: {selectedService.min.toLocaleString()}, макс: {selectedService.max.toLocaleString()})
                </span>
              </label>
              <Input
                type="number"
                placeholder={selectedService.min.toString()}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                min={selectedService.min}
                max={selectedService.max}
              />
              {qty > 0 && !isValidQuantity && (
                <p className="text-xs text-destructive mt-1">
                  Количество должно быть от {selectedService.min.toLocaleString()} до {selectedService.max.toLocaleString()}
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Price Display ── */}
      <AnimatePresence>
        {selectedService && isValidQuantity && link.trim() && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3 rounded-lg bg-secondary/50 border"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Итого</p>
                <p className="text-2xl font-bold">
                  {calculatedPrice.toFixed(2)} <span className="text-lg text-muted-foreground">₽</span>
                </p>
              </div>
              <div className="text-right">
                <Badge variant="outline" className="text-xs mb-1">
                  {qty.toLocaleString()} шт
                </Badge>
                <p className="text-xs text-muted-foreground">
                  {selectedCategory} · {selectedService.name}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Buy Button ── */}
      <Button
        size="lg"
        className="w-full gap-2"
        disabled={
          !selectedService ||
          !link.trim() ||
          !isValidQuantity ||
          calculatedPrice <= 0 ||
          createOrder.isPending
        }
        onClick={handleBuy}
      >
        {createOrder.isPending ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            Создаём заказ...
          </>
        ) : (
          <>
            <ShoppingCart className="h-5 w-5" />
            {selectedService && isValidQuantity && link.trim()
              ? `Купить за ${calculatedPrice.toFixed(2)} ₽`
              : 'Заполните все поля'}
          </>
        )}
      </Button>

      <p className="text-xs text-muted-foreground text-center">
        После оплаты накрутка начнётся автоматически. Статус можно отслеживать в профиле.
      </p>
    </div>
  );
};
