import { Link } from 'react-router-dom';
import { useCart } from '@/contexts/CartContext';
import { useTelegram } from '@/contexts/TelegramContext';
import { usePayment } from '@/hooks/usePayment';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, ShoppingBag, ArrowRight, AlertTriangle, Check, CreditCard, Wallet } from 'lucide-react';
import { useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';

const CartPage = () => {
  const { items, removeItem, clearCart, total, itemCount } = useCart();
  const { user, webApp, hapticFeedback } = useTelegram();
  const { payWithCryptoBot, payWithBalance, isProcessing } = usePayment();
  
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [orderComplete, setOrderComplete] = useState(false);
  const [completedOrderId, setCompletedOrderId] = useState<string | null>(null);

  const canPayWithBalance = user && user.balance >= total;

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
      },
    }));

    const result = await payWithCryptoBot(cartItems, total);

    if (result.success && result.invoiceUrl) {
      hapticFeedback('success');
      // Open CryptoBot payment in Telegram
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
    if (!agreedToTerms || !user || !canPayWithBalance) return;

    hapticFeedback('medium');

    const cartItems = items.map(item => ({
      productId: item.product.id,
      productName: item.product.name,
      price: item.product.price,
      quantity: item.quantity,
      options: {
        country: item.selectedCountry,
        services: item.selectedServices,
      },
    }));

    const result = await payWithBalance(cartItems, total);

    if (result.success) {
      hapticFeedback('success');
      setCompletedOrderId(result.orderId || null);
      clearCart();
      setOrderComplete(true);
      toast.success('Заказ оплачен!');
    } else {
      hapticFeedback('error');
      toast.error(result.error || 'Ошибка оплаты');
    }
  };

  if (orderComplete) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 pt-20">
          <div className="container mx-auto px-4 py-16">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="max-w-md mx-auto text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring' }}
                className="w-20 h-20 mx-auto mb-6 rounded-full bg-foreground text-background flex items-center justify-center"
              >
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
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 pt-20">
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold mb-8">Корзина</h1>

          {items.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-16"
            >
              <ShoppingBag className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-xl font-semibold mb-2">Корзина пуста</h2>
              <p className="text-muted-foreground mb-6">
                Добавьте товары из каталога
              </p>
              <Link to="/catalog">
                <Button>Перейти в каталог</Button>
              </Link>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Cart Items */}
              <div className="lg:col-span-2 space-y-4">
                <AnimatePresence>
                  {items.map((item, index) => (
                    <motion.div
                      key={item.product.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -100 }}
                      transition={{ delay: index * 0.1 }}
                      className="p-6 rounded-xl border bg-card flex flex-col sm:flex-row gap-4"
                    >
                      <div className="flex-1">
                        <Link to={`/product/${item.product.id}`}>
                          <h3 className="font-semibold hover:underline">
                            {item.product.name}
                          </h3>
                        </Link>
                        <p className="text-sm text-muted-foreground mt-1">
                          {item.product.shortDesc}
                        </p>
                        {item.selectedCountry && (
                          <p className="text-sm mt-2">
                            Страна: {item.selectedCountry}
                          </p>
                        )}
                        {item.selectedServices && item.selectedServices.length > 0 && (
                          <p className="text-sm mt-1">
                            Сервисы: {item.selectedServices.join(', ')}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-bold">
                            {(item.product.price * item.quantity).toLocaleString('ru-RU')} ₽
                          </p>
                          {item.product.type === 'subscription' && (
                            <p className="text-xs text-muted-foreground">/мес</p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeItem(item.product.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              {/* Order Summary */}
              <div>
                <div className="sticky top-24 p-6 rounded-xl border bg-card">
                  <h2 className="font-semibold text-lg mb-4">Итого</h2>
                  
                  <div className="space-y-3 mb-6">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Товаров</span>
                      <span>{itemCount}</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold pt-3 border-t">
                      <span>К оплате</span>
                      <span>{total.toLocaleString('ru-RU')} ₽</span>
                    </div>
                  </div>

                  {user && (
                    <div className="mb-6 p-3 rounded-lg bg-secondary text-sm">
                      <div className="flex justify-between">
                        <span>Ваш баланс</span>
                        <span className={!canPayWithBalance ? 'text-destructive' : 'text-green-500'}>
                          {user.balance.toLocaleString('ru-RU')} ₽
                        </span>
                      </div>
                      {!canPayWithBalance && (
                        <p className="text-xs text-muted-foreground mt-2">
                          Недостаточно средств. Пополните баланс или оплатите через CryptoBot.
                        </p>
                      )}
                    </div>
                  )}

                  {/* Terms Agreement */}
                  <div className="flex items-start gap-3 mb-6">
                    <Checkbox
                      id="terms"
                      checked={agreedToTerms}
                      onCheckedChange={(checked) => setAgreedToTerms(checked as boolean)}
                    />
                    <label htmlFor="terms" className="text-xs text-muted-foreground cursor-pointer">
                      Подтверждаю честное и законное использование продукта в соответствии 
                      с правилами магазина
                    </label>
                  </div>

                  {/* Payment Buttons */}
                  <div className="space-y-3">
                    {canPayWithBalance && (
                      <Button
                        size="lg"
                        className="w-full gap-2"
                        disabled={!agreedToTerms || isProcessing}
                        onClick={handlePayWithBalance}
                      >
                        {isProcessing ? (
                          'Обработка...'
                        ) : (
                          <>
                            <Wallet className="h-4 w-4" />
                            Оплатить с баланса
                          </>
                        )}
                      </Button>
                    )}

                    <Button
                      size="lg"
                      variant={canPayWithBalance ? 'outline' : 'default'}
                      className="w-full gap-2"
                      disabled={!agreedToTerms || isProcessing}
                      onClick={handlePayWithCrypto}
                    >
                      {isProcessing ? (
                        'Обработка...'
                      ) : (
                        <>
                          <CreditCard className="h-4 w-4" />
                          Оплатить через CryptoBot
                        </>
                      )}
                    </Button>
                  </div>

                  <div className="flex items-start gap-2 mt-4 text-xs text-muted-foreground">
                    <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <p>
                      Нарушение правил влечёт блокировку аккаунта
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default CartPage;
