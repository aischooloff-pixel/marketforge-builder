import { useState, useCallback } from 'react';
import { useTelegram } from '@/contexts/TelegramContext';
import { useCart } from '@/contexts/CartContext';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Loader2, ShoppingCart, X, User, Star } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import telegramStarsIcon from '@/assets/telegram-stars.png';
import { useExchangeRate, usdToRub, formatUsd } from '@/hooks/useExchangeRate';

const STAR_RATE_USD = 0.016; // USD per star

const STAR_PACKAGES = [50, 250, 500, 1000, 2500];

interface ResolvedUser {
  id: number | null;
  username: string;
  first_name: string;
  last_name: string | null;
  photo_url: string | null;
  type: string;
  source?: string;
}

interface StarsBuyerProps {
  productId: string;
}

export const StarsBuyer = ({ productId }: StarsBuyerProps) => {
  const { user } = useTelegram();
  const { addItem } = useCart();
  const { data: rate = 90 } = useExchangeRate();

  const [step, setStep] = useState<'username' | 'quantity'>('username');
  const [usernameInput, setUsernameInput] = useState('');
  const [resolvedUser, setResolvedUser] = useState<ResolvedUser | null>(null);
  const [isResolving, setIsResolving] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState('');
  const [useSelf, setUseSelf] = useState(false);
  const [addedToCart, setAddedToCart] = useState(false);

  const starCount = selectedPackage || (parseInt(customAmount) || 0);
  const totalPrice = Math.round(starCount * STAR_RATE_USD * 100) / 100;

  const resolveUsername = useCallback(async (input: string) => {
    if (!input.trim()) return;
    setIsResolving(true);
    try {
      const res = await supabase.functions.invoke('telegram-resolve-user', {
        body: { username: input.trim() },
      });

      if (res.error) {
        toast.error('Не удалось найти пользователя');
        setResolvedUser(null);
      } else if (res.data?.error) {
        toast.error(res.data.error);
        setResolvedUser(null);
      } else if (res.data) {
        // Only allow private users, not channels/groups/bots
        const userType = res.data.type;
        if (userType === 'channel' || userType === 'group' || userType === 'supergroup') {
          toast.error('Можно отправить звёзды только пользователю, не каналу или группе');
          setResolvedUser(null);
          return;
        }
        setResolvedUser(res.data);
        setAddedToCart(false);
        setStep('quantity');
      }
    } catch {
      toast.error('Ошибка при поиске пользователя');
    } finally {
      setIsResolving(false);
    }
  }, []);

  const handleUseSelf = useCallback(async () => {
    if (!user?.username) {
      toast.error('У вас не установлен username в Telegram');
      return;
    }
    setUseSelf(true);
    await resolveUsername(user.username);
  }, [user, resolveUsername]);

  const clearUser = () => {
    setResolvedUser(null);
    setUseSelf(false);
    setUsernameInput('');
    setStep('username');
    setSelectedPackage(null);
    setCustomAmount('');
  };

  const handleAddToCart = () => {
    if (!resolvedUser || starCount < 1) return;

    addItem({
      id: `stars-${resolvedUser.username}-${starCount}-${Date.now()}`,
      name: 'Telegram Stars',
      shortDesc: `${starCount} ⭐ → @${resolvedUser.username}`,
      longDesc: '',
      price: totalPrice,
      type: 'one-time',
      category: 'telegram',
      tags: ['api:stars'],
      legalNote: '',
      popular: false,
    }, {
      country: resolvedUser.username,
      services: [`${starCount}`],
    });

    setAddedToCart(true);
    toast.success(`${starCount} ⭐ для @${resolvedUser.username} добавлено в корзину`);
  };

  return (
    <div className="space-y-4">
      {/* Stars icon */}
      <div className="flex items-center gap-3 mb-2">
        <img src={telegramStarsIcon} alt="Telegram Stars" className="w-8 h-8" />
        <div>
          <p className="text-sm font-medium">Telegram Stars</p>
          <p className="text-xs text-muted-foreground">Курс: {STAR_RATE_USD} $ за звезду</p>
        </div>
      </div>

      {/* Step 1: Username selector */}
      <AnimatePresence mode="wait">
        {!resolvedUser ? (
          <motion.div
            key="username-step"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-3"
          >
            <label className="text-sm font-medium flex items-center gap-2">
              <User className="h-4 w-4" />
              Кому отправить звёзды?
            </label>

            {/* Self button */}
            {user?.username && (
              <Button
                variant="outline"
                className="w-full justify-start gap-2"
                onClick={handleUseSelf}
                disabled={isResolving}
              >
                {isResolving && useSelf ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <User className="h-4 w-4" />
                )}
                Себе (@{user.username})
              </Button>
            )}

            <div className="flex gap-2">
              <Input
                placeholder="@username или t.me/username"
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && resolveUsername(usernameInput)}
              />
              <Button
                onClick={() => resolveUsername(usernameInput)}
                disabled={!usernameInput.trim() || isResolving}
              >
                {isResolving && !useSelf ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Найти'
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Только пользователи. Каналы и группы не поддерживаются.
            </p>
          </motion.div>
        ) : (
          <motion.div
            key="resolved-user"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <label className="text-sm font-medium flex items-center gap-2 mb-2">
              <User className="h-4 w-4" />
              Получатель
            </label>
            <div className="flex items-center gap-3 p-3 rounded-lg border bg-secondary/30">
              {resolvedUser.photo_url ? (
                <img
                  src={resolvedUser.photo_url}
                  alt=""
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                  <User className="h-5 w-5 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{resolvedUser.first_name}</p>
                <p className="text-xs text-muted-foreground">@{resolvedUser.username}</p>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={clearUser}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Step 2: Star amount selector */}
      <AnimatePresence>
        {resolvedUser && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-3"
          >
            <label className="text-sm font-medium flex items-center gap-2">
              <Star className="h-4 w-4" />
              Количество звёзд
            </label>

            {/* Packages */}
            <div className="grid grid-cols-3 gap-2">
              {STAR_PACKAGES.map((pkg) => (
                <button
                  key={pkg}
                  onClick={() => {
                    setSelectedPackage(pkg);
                    setCustomAmount('');
                  }}
                  className={`p-3 rounded-lg border text-center transition-colors ${
                    selectedPackage === pkg
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-card hover:bg-secondary border-border'
                  }`}
                >
              <div className="flex items-center justify-center gap-1">
                    <p className="text-lg font-bold">{pkg}</p>
                    <img src={telegramStarsIcon} alt="" className="w-4 h-4 rounded-full" />
                  </div>
                  <p className={`text-xs ${
                    selectedPackage === pkg ? 'text-primary-foreground/70' : 'text-muted-foreground'
                  }`}>
                    {formatUsd(Math.round(pkg * STAR_RATE_USD * 100) / 100)} $
                  </p>
                </button>
              ))}
              {/* Custom */}
              <button
                onClick={() => {
                  setSelectedPackage(null);
                  setCustomAmount('');
                }}
                className={`p-3 rounded-lg border text-center transition-colors ${
                  selectedPackage === null && customAmount
                    ? 'bg-primary text-primary-foreground border-primary'
                    : !selectedPackage
                    ? 'ring-2 ring-primary border-primary'
                    : 'bg-card hover:bg-secondary border-border'
                }`}
              >
                <p className="text-lg font-bold">...</p>
                <p className={`text-xs ${
                  !selectedPackage ? 'text-primary-foreground/70' : 'text-muted-foreground'
                }`}>
                  Своё
                </p>
              </button>
            </div>

            {/* Custom input */}
            {selectedPackage === null && (
              <Input
                type="number"
                placeholder="Введите количество звёзд"
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                min={1}
                autoFocus
              />
            )}

            {/* Price display */}
            {starCount > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 rounded-lg bg-secondary/50 border"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Итого</p>
                    <p className="text-2xl font-bold">
                      {formatUsd(totalPrice)}{' '}
                      <span className="text-lg text-muted-foreground">$</span>
                    </p>
                    <p className="text-xs text-muted-foreground">{usdToRub(totalPrice, rate).toLocaleString('ru-RU')} ₽</p>
                  </div>
                  <Badge variant="outline">
                    {starCount.toLocaleString()} ⭐
                  </Badge>
                </div>
              </motion.div>
            )}

            {/* Add to cart */}
            <Button
              size="lg"
              className="w-full gap-2"
              disabled={starCount < 1}
              onClick={handleAddToCart}
            >
              <ShoppingCart className="h-5 w-5" />
              {addedToCart ? 'Добавить ещё' : 'Добавить в корзину'}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
