import { Link } from 'react-router-dom';
import { useCart } from '@/contexts/CartContext';
import { useTelegram } from '@/contexts/TelegramContext';
import { usePayment } from '@/hooks/usePayment';
import { useAdmin } from '@/hooks/useAdmin';
import { useProductStock } from '@/hooks/useProducts';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { PxCart, PxCheck, PxPlus, PxFolder } from '@/components/PixelIcons';
import { useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import cryptoBotLogo from '@/assets/cryptobot-logo.jpg';
import xrocketLogo from '@/assets/xrocket-logo.jpg';

// Cart item row with stock-aware quantity limits
const CartItemRow = ({
  item,
  index,
  updateQuantity,
  removeItem
}: {
  item: {
    product: any;
    quantity: number;
    selectedCountry?: string;
    selectedServices?: string[];
    selectedPeriod?: number;
    selectedProtocol?: string;
  };
  index: number;
  updateQuantity: (id: string, qty: number) => void;
  removeItem: (id: string) => void;
}) => {
  const { data: stockCount = 0 } = useProductStock(item.product.id);
  const maxQty = stockCount === -1 ? 99 : stockCount;

  return (
    <motion.div
      key={item.product.id}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -50 }}
      transition={{ delay: index * 0.05 }}
      className="bevel-sunken p-3 flex flex-col sm:flex-row gap-3"
    >
      <div className="flex-1">
        <Link to={`/product/${item.product.id}`}>
          <h3 className="font-pixel text-[11px] text-primary hover:underline">
            {item.product.name}
          </h3>
        </Link>
        <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
          {item.product.shortDesc}
        </p>
        {item.selectedCountry && (
          <p className="text-[10px] font-mono mt-1">Страна: {item.selectedCountry.toUpperCase()}</p>
        )}
        {item.selectedPeriod && (
          <p className="text-[10px] font-mono mt-0.5">Период: {item.selectedPeriod} дн.</p>
        )}
        {item.selectedProtocol && (
          <p className="text-[10px] font-mono mt-0.5">Протокол: {item.selectedProtocol === 'socks' ? 'SOCKS5' : 'HTTP/HTTPS'}</p>
        )}
        {item.selectedServices && item.selectedServices.length > 0 && (
          <p className="text-[10px] font-mono mt-0.5">Сервисы: {item.selectedServices.join(', ')}</p>
        )}
        {maxQty > 0 && maxQty < 99 && item.quantity > maxQty && (
          <p className="text-[9px] text-destructive font-pixel mt-1">В НАЛИЧИИ: {maxQty} ШТ</p>
        )}
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center bevel-sunken bg-card">
              <button
                className="bevel-raised h-6 w-6 flex items-center justify-center text-[10px] active:bevel-sunken"
                onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
              >
                −
              </button>
              <span className="w-8 text-center text-[11px] font-pixel">{item.quantity}</span>
              <button
                className="bevel-raised h-6 w-6 flex items-center justify-center text-[10px] active:bevel-sunken disabled:opacity-50"
                disabled={item.quantity >= maxQty}
                onClick={() => updateQuantity(item.product.id, Math.min(item.quantity + 1, maxQty))}
              >
                +
              </button>
        </div>
        <div className="text-right">
          <p className="font-pixel text-[11px] text-primary">
            {(item.product.price * item.quantity).toLocaleString('ru-RU')} ₽
          </p>
          {item.quantity > 1 && (
            <p className="text-[9px] text-muted-foreground font-mono">
              {item.product.price.toLocaleString('ru-RU')} ₽ × {item.quantity}
            </p>
          )}
        </div>
        <button
          className="bevel-raised bg-card h-6 w-6 flex items-center justify-center text-[10px] text-destructive active:bevel-sunken"
          onClick={() => removeItem(item.product.id)}
        >
          ✕
        </button>
      </div>
    </motion.div>
  );
};

const CartPage = () => {
  const { items, removeItem, updateQuantity, clearCart, total, itemCount } = useCart();
  const { user, webApp, hapticFeedback } = useTelegram();
  const { payWithCryptoBot, payWithXRocket, payWithBalance, isProcessing } = usePayment();
  const [paymentMethod, setPaymentMethod] = useState<'cryptobot' | 'xrocket'>('cryptobot');
  const { validatePromo } = useAdmin();
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [orderComplete, setOrderComplete] = useState(false);
  const [useBalance, setUseBalance] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [promoId, setPromoId] = useState<string | null>(null);
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoError, setPromoError] = useState('');
  const discountedTotal = promoDiscount > 0 ? Math.round(total * (1 - promoDiscount / 100)) : total;
  const userBalance = user?.balance || 0;
  const canPayWithBalance = userBalance >= discountedTotal && discountedTotal > 0;
  const balanceToUse = useBalance ? Math.min(userBalance, discountedTotal) : 0;
  const cryptoAmount = discountedTotal - balanceToUse;

  const handleApplyPromo = async () => {
    if (!promoCode.trim()) return;
    setPromoLoading(true);
    setPromoError('');
    const result = await validatePromo(promoCode, user?.id);
    if (result?.valid) {
      setPromoDiscount(result.discount_percent || 0);
      setPromoId(result.promo_id || null);
      toast.success(`Промокод применён: -${result.discount_percent}%`);
      hapticFeedback('success');
    } else {
      setPromoError(result?.error || 'Неверный промокод');
      setPromoDiscount(0);
      setPromoId(null);
      hapticFeedback('error');
    }
    setPromoLoading(false);
  };

  const handlePayWithCrypto = async () => {
    if (!agreedToTerms || !user) return;
    hapticFeedback('medium');
    const cartItems = items.map(item => ({
      productId: item.product.id,
      productName: item.product.name,
      price: item.product.price,
      quantity: item.quantity,
      options: {
        country: item.selectedCountry,
        services: item.selectedServices,
        period: item.selectedPeriod,
        protocol: item.selectedProtocol,
      }
    }));
    
    const payFn = paymentMethod === 'xrocket' ? payWithXRocket : payWithCryptoBot;
    const result = await payFn(cartItems, discountedTotal, balanceToUse);
    
    if (result.success && result.invoiceUrl) {
      hapticFeedback('success');
      if (webApp && result.invoiceUrl.includes('t.me')) {
        webApp.openTelegramLink(result.invoiceUrl);
      } else if (result.invoiceUrl) {
        window.open(result.invoiceUrl, '_blank');
      }
      const methodName = paymentMethod === 'xrocket' ? 'xRocket' : 'CryptoBot';
      toast.success(`Счёт создан! Оплатите в ${methodName}.`);
    } else {
      hapticFeedback('error');
      toast.error(result.error || 'Ошибка создания счёта');
    }
  };

  const handlePayWithBalance = async () => {
    if (!agreedToTerms || !user) return;
    hapticFeedback('medium');
    const cartItems = items.map(item => ({
      productId: item.product.id,
      productName: item.product.name,
      price: item.product.price,
      quantity: item.quantity,
      options: {
        country: item.selectedCountry,
        services: item.selectedServices,
        period: item.selectedPeriod,
        protocol: item.selectedProtocol,
      }
    }));
    const result = await payWithBalance(cartItems, discountedTotal);
    if (result.success) {
      hapticFeedback('success');
      clearCart();
      setOrderComplete(true);
      toast.success('Заказ оплачен с баланса!');
    } else {
      hapticFeedback('error');
      toast.error(result.error || 'Ошибка оплаты');
    }
  };

  if (orderComplete) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 pt-20">
          <div className="container mx-auto px-4 py-16">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="win95-window max-w-sm mx-auto"
            >
              <div className="win95-titlebar px-2 py-1">
                <span className="font-pixel text-[10px]">✓ заказ оплачен</span>
              </div>
              <div className="p-6 text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: 'spring' }}
                  className="w-16 h-16 mx-auto mb-4 bevel-sunken bg-primary/20 flex items-center justify-center"
                >
                  <PxCheck size={32} className="text-primary" />
                </motion.div>
                <h1 className="font-pixel text-sm mb-3">ЗАКАЗ ОПЛАЧЕН!</h1>
                <p className="text-[10px] text-muted-foreground font-mono mb-6">
                  Товары выданы автоматически. Посмотреть можно в профиле.
                </p>
                <div className="flex flex-col gap-2">
                  <Link to="/profile">
                    <Button className="w-full bevel-raised font-pixel text-[10px]">ПРОФИЛЬ</Button>
                  </Link>
                  <Link to="/catalog">
                    <Button variant="outline" className="w-full bevel-raised font-pixel text-[10px]">КАТАЛОГ</Button>
                  </Link>
                </div>
              </div>
            </motion.div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 pt-20 flex items-center justify-center">
          <div className="win95-window max-w-sm w-full mx-4">
            <div className="win95-titlebar px-2 py-1">
              <span className="font-pixel text-[10px]">⚠ авторизация</span>
            </div>
            <div className="p-6 text-center">
              <PxCart size={48} className="mx-auto mb-4 text-muted-foreground" />
              <h1 className="text-xl font-pixel mb-2">Войдите в аккаунт</h1>
              <p className="text-sm text-muted-foreground font-mono">
                Откройте приложение через Telegram для авторизации
              </p>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <main className="flex-1 pt-16 md:pt-20">
        <div className="container mx-auto px-3 py-4 md:px-4 md:py-8 max-w-5xl">
          
          {items.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="win95-window max-w-sm mx-auto"
            >
              <div className="win95-titlebar px-2 py-1">
                <span className="font-pixel text-[10px]">🛒 корзина</span>
              </div>
              <div className="p-8 text-center">
                <PxCart size={40} className="mx-auto mb-4 text-muted-foreground opacity-50" />
                <h2 className="font-pixel text-[11px] mb-2">КОРЗИНА ПУСТА</h2>
                <p className="text-[10px] text-muted-foreground font-mono mb-4">
                  Добавьте товары из каталога
                </p>
                <Link to="/catalog">
                  <Button className="bevel-raised font-pixel text-[10px]">КАТАЛОГ</Button>
                </Link>
              </div>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Cart Items */}
              <div className="lg:col-span-2">
                <div className="win95-window">
                  <div className="win95-titlebar px-2 py-1">
                    <span className="flex items-center gap-1">
                      <PxCart size={12} />
                      <span className="font-pixel text-[10px]">корзина ({itemCount})</span>
                    </span>
                  </div>
                  <div className="p-2 space-y-2">
                    <AnimatePresence>
                      {items.map((item, index) => (
                        <CartItemRow
                          key={item.product.id}
                          item={item}
                          index={index}
                          updateQuantity={updateQuantity}
                          removeItem={removeItem}
                        />
                      ))}
                    </AnimatePresence>
                  </div>
                </div>
              </div>

              {/* Order Summary */}
              <div>
                <div className="win95-window sticky top-24">
                  <div className="win95-titlebar px-2 py-1">
                    <span className="flex items-center gap-1">
                      <PxFolder size={12} />
                      <span className="font-pixel text-[10px]">итого</span>
                    </span>
                  </div>
                  <div className="p-3 space-y-3">
                    {/* Summary */}
                    <div className="bevel-sunken p-2 space-y-1">
                      <div className="flex justify-between text-[10px] font-mono">
                        <span className="text-muted-foreground">Товаров:</span>
                        <span>{itemCount}</span>
                      </div>
                      {promoDiscount > 0 && (
                        <>
                          <div className="flex justify-between text-[10px] font-mono">
                            <span className="text-muted-foreground">Сумма:</span>
                            <span className="line-through text-muted-foreground">{total.toLocaleString('ru-RU')} ₽</span>
                          </div>
                          <div className="flex justify-between text-[10px] font-mono text-primary">
                            <span>Скидка ({promoDiscount}%):</span>
                            <span>-{(total - discountedTotal).toLocaleString('ru-RU')} ₽</span>
                          </div>
                        </>
                      )}
                      <div className="flex justify-between font-pixel text-[11px] pt-1 border-t border-border">
                        <span>К ОПЛАТЕ:</span>
                        <span className="text-primary">{discountedTotal.toLocaleString('ru-RU')} ₽</span>
                      </div>
                    </div>

                    {/* Use Balance Toggle */}
                    {userBalance > 0 && discountedTotal > 0 && (
                      <div className="bevel-sunken p-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Checkbox id="use-balance" checked={useBalance} onCheckedChange={checked => setUseBalance(checked as boolean)} />
                            <label htmlFor="use-balance" className="text-[10px] font-pixel cursor-pointer">
                              💰 С БАЛАНСА
                            </label>
                          </div>
                          <span className="text-[10px] font-pixel text-primary">{userBalance.toLocaleString('ru-RU')} ₽</span>
                        </div>
                        {useBalance && (
                          <div className="mt-1 space-y-0.5 text-[9px] font-mono text-muted-foreground">
                            <div className="flex justify-between">
                              <span>Списание:</span>
                              <span>−{balanceToUse.toLocaleString('ru-RU')} ₽</span>
                            </div>
                            {cryptoAmount > 0 && (
                              <div className="flex justify-between text-foreground">
                                <span>Доплата крипто:</span>
                                <span>{cryptoAmount.toLocaleString('ru-RU')} ₽</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Promo Code */}
                    <div className="flex gap-1">
                      <Input
                        placeholder="ПРОМОКОД"
                        value={promoCode}
                        onChange={e => setPromoCode(e.target.value.toUpperCase())}
                        disabled={promoDiscount > 0}
                        className="bevel-sunken border-0 font-mono text-[10px] h-7 rounded-none"
                      />
                      <button
                        className="bevel-raised bg-card h-7 w-8 flex items-center justify-center text-[10px] active:bevel-sunken disabled:opacity-50"
                        onClick={promoDiscount > 0 ? () => {
                          setPromoDiscount(0);
                          setPromoId(null);
                          setPromoCode('');
                          setPromoError('');
                        } : handleApplyPromo}
                        disabled={promoLoading || (!promoCode.trim() && promoDiscount === 0)}
                      >
                        {promoLoading ? '⏳' : promoDiscount > 0 ? '✕' : '🎫'}
                      </button>
                    </div>
                    {promoError && <p className="text-[9px] text-destructive font-pixel">{promoError}</p>}
                    {promoDiscount > 0 && <p className="text-[9px] text-primary font-pixel">✓ СКИДКА: -{promoDiscount}%</p>}

                    {/* Terms Agreement */}
                    <div className="flex items-start gap-2">
                      <Checkbox id="terms" checked={agreedToTerms} onCheckedChange={checked => setAgreedToTerms(checked as boolean)} />
                      <label htmlFor="terms" className="text-[9px] text-muted-foreground font-mono cursor-pointer leading-tight">
                        Подтверждаю честное и законное использование продукта
                      </label>
                    </div>

                    {/* Full Balance Payment */}
                    {useBalance && canPayWithBalance && (
                      <Button
                        className="w-full bevel-raised font-pixel text-[10px] gap-1"
                        disabled={!agreedToTerms || isProcessing}
                        onClick={handlePayWithBalance}
                      >
                        {isProcessing ? 'ОБРАБОТКА...' : (
                          <>💰 ОПЛАТИТЬ С БАЛАНСА ({discountedTotal.toLocaleString('ru-RU')} ₽)</>
                        )}
                      </Button>
                    )}

                    {/* Payment Method Selection */}
                    {!(useBalance && canPayWithBalance) && (
                      <>
                        <div className="grid grid-cols-2 gap-1">
                          <button
                            type="button"
                            onClick={() => setPaymentMethod('cryptobot')}
                            className={`bevel-raised p-2 flex items-center gap-1.5 ${
                              paymentMethod === 'cryptobot' ? 'bevel-sunken bg-primary/10' : 'bg-card hover:bg-muted'
                            }`}
                          >
                            <img src={cryptoBotLogo} alt="CryptoBot" className="w-6 h-6 rounded-sm" />
                            <div className="text-left">
                              <p className="font-pixel text-[8px]">CryptoBot</p>
                              <p className="text-[7px] text-muted-foreground font-mono">USDT, TON</p>
                            </div>
                          </button>
                          <button
                            type="button"
                            onClick={() => setPaymentMethod('xrocket')}
                            className={`bevel-raised p-2 flex items-center gap-1.5 ${
                              paymentMethod === 'xrocket' ? 'bevel-sunken bg-primary/10' : 'bg-card hover:bg-muted'
                            }`}
                          >
                            <img src={xrocketLogo} alt="xRocket" className="w-6 h-6 rounded-sm" />
                            <div className="text-left">
                              <p className="font-pixel text-[8px]">xRocket</p>
                              <p className="text-[7px] text-muted-foreground font-mono">USDT</p>
                            </div>
                          </button>
                        </div>

                        {/* Crypto Payment Button */}
                        <Button
                          className="w-full bevel-raised font-pixel text-[10px] gap-1"
                          disabled={!agreedToTerms || isProcessing}
                          onClick={handlePayWithCrypto}
                        >
                          {isProcessing ? 'СОЗДАНИЕ СЧЁТА...' : (
                            <>
                              <img src={paymentMethod === 'xrocket' ? xrocketLogo : cryptoBotLogo} alt="" className="w-4 h-4 rounded-sm" />
                              {useBalance && balanceToUse > 0 
                                ? `ДОПЛАТИТЬ ${cryptoAmount.toLocaleString('ru-RU')} ₽` 
                                : `ОПЛАТИТЬ ${discountedTotal.toLocaleString('ru-RU')} ₽`}
                            </>
                          )}
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Spacer for mobile bottom nav */}
      <div className="h-20 md:hidden" />
      <Footer />
    </div>
  );
};

export default CartPage;
