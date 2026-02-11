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
import { Trash2, ShoppingBag, AlertTriangle, Check, Ticket, Loader2, Wallet, Plus, Minus } from 'lucide-react';
import { useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import cryptoBotLogo from '@/assets/cryptobot-logo.jpg';

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
  const {
    data: stockCount = 0
  } = useProductStock(item.product.id);
  const maxQty = stockCount === -1 ? 99 : stockCount;
  return <motion.div key={item.product.id} initial={{
    opacity: 0,
    y: 20
  }} animate={{
    opacity: 1,
    y: 0
  }} exit={{
    opacity: 0,
    x: -100
  }} transition={{
    delay: index * 0.1
  }} className="p-6 rounded-xl border bg-card flex flex-col sm:flex-row gap-4">
      <div className="flex-1">
        <Link to={`/product/${item.product.id}`}>
          <h3 className="font-semibold hover:underline">
            {item.product.name}
          </h3>
        </Link>
        <p className="text-sm text-muted-foreground mt-1">
          {item.product.shortDesc}
        </p>
        {item.selectedCountry && <p className="text-sm mt-2">
            Страна: {item.selectedCountry.toUpperCase()}
          </p>}
        {item.selectedPeriod && <p className="text-sm mt-1">
            Период: {`${item.selectedPeriod} дн.`}
          </p>}
        {item.selectedProtocol && <p className="text-sm mt-1">
            Протокол: {item.selectedProtocol === 'socks' ? 'SOCKS5' : 'HTTP/HTTPS'}
          </p>}
        {item.selectedServices && item.selectedServices.length > 0 && <p className="text-sm mt-1">
            Сервисы: {item.selectedServices.join(', ')}
          </p>}
        {maxQty > 0 && maxQty < 99 && item.quantity > maxQty && <p className="text-xs text-destructive mt-1">
            В наличии только {maxQty} шт
          </p>}
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1 border rounded-lg">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => updateQuantity(item.product.id, item.quantity - 1)}>
            <Minus className="h-3 w-3" />
          </Button>
          <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
          <Button variant="ghost" size="icon" className="h-8 w-8" disabled={item.quantity >= maxQty} onClick={() => updateQuantity(item.product.id, Math.min(item.quantity + 1, maxQty))}>
            <Plus className="h-3 w-3" />
          </Button>
        </div>
        <div className="text-right">
          <p className="font-bold">
            {(item.product.price * item.quantity).toLocaleString('ru-RU')} ₽
          </p>
          {item.quantity > 1 && <p className="text-xs text-muted-foreground">
              {item.product.price.toLocaleString('ru-RU')} ₽ × {item.quantity}
            </p>}
        </div>
        <Button variant="ghost" size="icon" onClick={() => removeItem(item.product.id)}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </motion.div>;
};
const CartPage = () => {
  const {
    items,
    removeItem,
    updateQuantity,
    clearCart,
    total,
    itemCount
  } = useCart();
  const {
    user,
    webApp,
    hapticFeedback
  } = useTelegram();
  const {
    payWithCryptoBot,
    payWithBalance,
    isProcessing
  } = usePayment();
  const {
    validatePromo
  } = useAdmin();
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
    const result = await payWithCryptoBot(cartItems, discountedTotal, balanceToUse);
    if (result.success && result.invoiceUrl) {
      hapticFeedback('success');
      if (webApp) {
        webApp.openTelegramLink(result.invoiceUrl);
      } else {
        window.open(result.invoiceUrl, '_blank');
      }
      toast.success('Счёт создан! Оплатите в CryptoBot.');
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
    return <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 pt-20">
          <div className="container mx-auto px-4 py-16">
            <motion.div initial={{
            opacity: 0,
            scale: 0.9
          }} animate={{
            opacity: 1,
            scale: 1
          }} className="max-w-md mx-auto text-center">
              <motion.div initial={{
              scale: 0
            }} animate={{
              scale: 1
            }} transition={{
              delay: 0.2,
              type: 'spring'
            }} className="w-20 h-20 mx-auto mb-6 rounded-full bg-foreground text-background flex items-center justify-center">
                <Check className="h-10 w-10" />
              </motion.div>
              <h1 className="text-2xl font-bold mb-4">Заказ оплачен!</h1>
              <p className="text-muted-foreground mb-8">
                Товары выданы автоматически. Посмотреть их можно в профиле.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link to="/profile">
                  <Button>Перейти в профиль</Button>
                </Link>
                <Link to="/catalog">
                  <Button variant="outline">Продолжить покупки</Button>
                </Link>
              </div>
            </motion.div>
          </div>
        </main>
        <Footer />
      </div>;
  }
  return <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 pt-20">
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold mb-8">Корзина</h1>

          {items.length === 0 ? <motion.div initial={{
          opacity: 0
        }} animate={{
          opacity: 1
        }} className="text-center py-16">
              <ShoppingBag className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-xl font-semibold mb-2">Корзина пуста</h2>
              <p className="text-muted-foreground mb-6">
                Добавьте товары из каталога
              </p>
              <Link to="/catalog">
                <Button>Перейти в каталог</Button>
              </Link>
            </motion.div> : <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Cart Items */}
              <div className="lg:col-span-2 space-y-4">
                <AnimatePresence>
                  {items.map((item, index) => <CartItemRow key={item.product.id} item={item} index={index} updateQuantity={updateQuantity} removeItem={removeItem} />)}
                </AnimatePresence>
              </div>

              {/* Order Summary */}
              <div>
                <div className="sticky top-24 p-6 rounded-xl border bg-card">
                  <h2 className="font-semibold text-lg mb-4">Итого</h2>
                  
                  <div className="space-y-3 mb-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Товаров</span>
                      <span>{itemCount}</span>
                    </div>
                    {promoDiscount > 0 && <>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Сумма</span>
                          <span className="line-through text-muted-foreground">{total.toLocaleString('ru-RU')} ₽</span>
                        </div>
                        <div className="flex justify-between text-sm text-green-500">
                          <span>Скидка ({promoDiscount}%)</span>
                          <span>-{(total - discountedTotal).toLocaleString('ru-RU')} ₽</span>
                        </div>
                      </>}
                    <div className="flex justify-between text-lg font-bold pt-3 border-t">
                      <span>К оплате</span>
                      <span>{discountedTotal.toLocaleString('ru-RU')} ₽</span>
                    </div>
                  </div>

                  {/* Use Balance Toggle */}
                  {userBalance > 0 && discountedTotal > 0 && <div className="mb-4 p-3 rounded-lg border bg-muted/30">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Checkbox id="use-balance" checked={useBalance} onCheckedChange={checked => setUseBalance(checked as boolean)} />
                          <label htmlFor="use-balance" className="text-sm cursor-pointer">
                            <Wallet className="h-4 w-4 inline mr-1" />
                            Списать с баланса
                          </label>
                        </div>
                        <span className="text-sm font-medium">{userBalance.toLocaleString('ru-RU')} ₽</span>
                      </div>
                      {useBalance && <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                          <div className="flex justify-between">
                            <span>Списание с баланса</span>
                            <span>−{balanceToUse.toLocaleString('ru-RU')} ₽</span>
                          </div>
                          {cryptoAmount > 0 && <div className="flex justify-between font-medium text-foreground">
                              <span>Доплата через CryptoBot</span>
                              <span>{cryptoAmount.toLocaleString('ru-RU')} ₽</span>
                            </div>}
                        </div>}
                    </div>}

                  {/* Promo Code */}
                  <div className="mb-4">
                    <div className="flex gap-2">
                      <Input placeholder="Промокод" value={promoCode} onChange={e => setPromoCode(e.target.value.toUpperCase())} disabled={promoDiscount > 0} className="font-mono" />
                      <Button variant="outline" size="sm" onClick={promoDiscount > 0 ? () => {
                    setPromoDiscount(0);
                    setPromoId(null);
                    setPromoCode('');
                    setPromoError('');
                  } : handleApplyPromo} disabled={promoLoading || !promoCode.trim() && promoDiscount === 0}>
                        {promoLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : promoDiscount > 0 ? '✕' : <Ticket className="h-4 w-4" />}
                      </Button>
                    </div>
                    {promoError && <p className="text-xs text-destructive mt-1">{promoError}</p>}
                    {promoDiscount > 0 && <p className="text-xs text-green-500 mt-1">Промокод применён: -{promoDiscount}%</p>}
                  </div>

                  {/* Terms Agreement */}
                  <div className="flex items-start gap-3 mb-6">
                    <Checkbox id="terms" checked={agreedToTerms} onCheckedChange={checked => setAgreedToTerms(checked as boolean)} />
                    <label htmlFor="terms" className="text-xs text-muted-foreground cursor-pointer">
                      Подтверждаю честное и законное использование продукта
                    </label>
                  </div>

                  {/* Full Balance Payment */}
                  {useBalance && canPayWithBalance && <Button size="lg" className="w-full gap-3 mb-3" disabled={!agreedToTerms || isProcessing} onClick={handlePayWithBalance}>
                      {isProcessing ? 'Обработка...' : <>
                          <Wallet className="h-5 w-5" />
                          Оплатить с баланса ({discountedTotal.toLocaleString('ru-RU')} ₽)
                        </>}
                    </Button>}

                  {/* CryptoBot Payment (full or with balance deduction) */}
                  {!(useBalance && canPayWithBalance) && <Button size="lg" className="w-full gap-3" disabled={!agreedToTerms || isProcessing} onClick={handlePayWithCrypto}>
                      {isProcessing ? 'Создание счёта...' : <>
                          <img src={cryptoBotLogo} alt="CryptoBot" className="w-5 h-5 rounded-full" />
                          {useBalance && balanceToUse > 0 ? `Доплатить ${cryptoAmount.toLocaleString('ru-RU')} ₽ через CryptoBot` : `Оплатить ${discountedTotal.toLocaleString('ru-RU')} ₽ через CryptoBot`}
                        </>}
                    </Button>}

                  
                </div>
              </div>
            </div>}
        </div>
      </main>

      <Footer />
    </div>;
};
export default CartPage;