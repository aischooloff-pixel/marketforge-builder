import { useState } from 'react';
import { useUser } from '@/contexts/UserContext';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { motion } from 'framer-motion';
import { User, Wallet, Package, Clock, CreditCard, Smartphone, Building } from 'lucide-react';

const ProfilePage = () => {
  const { user, isLoggedIn, addTopUp } = useUser();
  const [topUpAmount, setTopUpAmount] = useState('');
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [isTopUpOpen, setIsTopUpOpen] = useState(false);

  const paymentMethods = [
    { id: 'card', name: 'Банковская карта', icon: CreditCard, description: 'Visa, MasterCard, МИР' },
    { id: 'sbp', name: 'СБП', icon: Smartphone, description: 'Система быстрых платежей' },
    { id: 'crypto', name: 'Криптовалюта', icon: Building, description: 'BTC, ETH, USDT' },
  ];

  const handleTopUp = () => {
    const amount = parseInt(topUpAmount);
    if (!amount || amount < 100) return;

    const topUp = {
      id: `topup-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      amount,
      method: paymentMethods.find(m => m.id === selectedMethod)?.name || 'Unknown',
      status: 'completed' as const
    };

    addTopUp(topUp);
    setTopUpAmount('');
    setSelectedMethod(null);
    setIsTopUpOpen(false);
  };

  if (!isLoggedIn || !user) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 pt-20 flex items-center justify-center">
          <div className="text-center">
            <User className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h1 className="text-2xl font-bold mb-2">Войдите в аккаунт</h1>
            <p className="text-muted-foreground">
              Функционал профиля доступен после авторизации
            </p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 pt-16 md:pt-20">
        <div className="container mx-auto px-4 py-4 md:py-8">
          {/* Profile Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col gap-4 mb-6 md:mb-8 p-4 md:p-6 rounded-xl border bg-card"
          >
            {/* Top row: Avatar + Info */}
            <div className="flex items-center gap-4">
              {/* Avatar */}
              <div className="w-14 h-14 md:w-20 md:h-20 rounded-full bg-secondary flex items-center justify-center text-xl md:text-3xl font-bold flex-shrink-0">
                {user.nickname.charAt(0).toUpperCase()}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <h1 className="text-lg md:text-2xl font-bold truncate">{user.nickname}</h1>
                <p className="text-sm text-muted-foreground">ID: {user.id}</p>
              </div>
            </div>

            {/* Balance row */}
            <div className="flex items-center justify-between gap-4 pt-4 border-t">
              <div>
                <p className="text-xs md:text-sm text-muted-foreground">Баланс</p>
                <p className="text-xl md:text-2xl font-bold">{user.balance.toLocaleString('ru-RU')} ₽</p>
              </div>
              <Dialog open={isTopUpOpen} onOpenChange={setIsTopUpOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-2 h-9 md:h-10">
                    <Wallet className="h-4 w-4" />
                    <span className="hidden sm:inline">Пополнить</span>
                    <span className="sm:hidden">+</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md mx-4">
                  <DialogHeader>
                    <DialogTitle className="text-lg">Пополнение баланса</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-2">
                    {/* Amount */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Сумма пополнения</label>
                      <Input
                        type="number"
                        placeholder="Минимум 100 ₽"
                        value={topUpAmount}
                        onChange={(e) => setTopUpAmount(e.target.value)}
                        min={100}
                        className="h-10"
                      />
                      <div className="grid grid-cols-4 gap-2">
                        {[500, 1000, 3000, 5000].map(amount => (
                          <Button
                            key={amount}
                            variant="outline"
                            size="sm"
                            onClick={() => setTopUpAmount(amount.toString())}
                            className="text-xs h-8"
                          >
                            {amount}₽
                          </Button>
                        ))}
                      </div>
                    </div>

                    {/* Payment Method */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Способ оплаты</label>
                      <div className="grid gap-2">
                        {paymentMethods.map(method => (
                          <button
                            key={method.id}
                            onClick={() => setSelectedMethod(method.id)}
                            className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                              selectedMethod === method.id
                                ? 'border-foreground bg-secondary'
                                : 'border-border hover:border-foreground/50'
                            }`}
                          >
                            <method.icon className="h-4 w-4" />
                            <div className="text-left">
                              <p className="font-medium text-sm">{method.name}</p>
                              <p className="text-xs text-muted-foreground">{method.description}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Submit */}
                    <Button
                      className="w-full"
                      disabled={!topUpAmount || parseInt(topUpAmount) < 100 || !selectedMethod}
                      onClick={handleTopUp}
                    >
                      Пополнить на {topUpAmount || '0'} ₽
                    </Button>

                    <p className="text-xs text-muted-foreground text-center">
                      Средства будут зачислены мгновенно после подтверждения платежа
                    </p>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </motion.div>

          {/* Tabs */}
          <Tabs defaultValue="orders" className="space-y-4 md:space-y-6">
            <TabsList className="w-full max-w-none grid grid-cols-2 h-10">
              <TabsTrigger value="orders" className="gap-1.5 text-xs md:text-sm">
                <Package className="h-3.5 w-3.5 md:h-4 md:w-4" />
                Заказы
              </TabsTrigger>
              <TabsTrigger value="topups" className="gap-1.5 text-xs md:text-sm">
                <Clock className="h-3.5 w-3.5 md:h-4 md:w-4" />
                Пополнения
              </TabsTrigger>
            </TabsList>

            {/* Orders Tab */}
            <TabsContent value="orders">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-3"
              >
                {user.orders.length === 0 ? (
                  <div className="text-center py-10 md:py-12 text-muted-foreground">
                    <Package className="h-10 w-10 md:h-12 md:w-12 mx-auto mb-3 md:mb-4 opacity-50" />
                    <p className="text-sm md:text-base">У вас пока нет заказов</p>
                  </div>
                ) : (
                  user.orders.map((order, index) => (
                    <motion.div
                      key={order.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="p-4 md:p-6 rounded-xl border bg-card"
                    >
                      <div className="flex justify-between gap-3 mb-3">
                        <div>
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <h3 className="font-semibold text-sm md:text-base">#{order.id}</h3>
                            <Badge variant={order.status === 'completed' ? 'default' : 'secondary'} className="text-xs">
                              {order.status === 'completed' ? 'Выполнен' : 
                               order.status === 'pending' ? 'В обработке' : 'Отменён'}
                            </Badge>
                          </div>
                          <p className="text-xs md:text-sm text-muted-foreground">{order.date}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-base md:text-lg">{order.total.toLocaleString('ru-RU')} ₽</p>
                        </div>
                      </div>
                      <div className="pt-3 border-t">
                        <ul className="space-y-1.5">
                          {order.items.map((item, i) => (
                            <li key={i} className="flex justify-between text-xs md:text-sm">
                              <span className="truncate flex-1 mr-2">{item.name}</span>
                              <span className="text-muted-foreground flex-shrink-0">{item.price.toLocaleString('ru-RU')} ₽</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </motion.div>
                  ))
                )}
              </motion.div>
            </TabsContent>

            {/* Top-ups Tab */}
            <TabsContent value="topups">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-3"
              >
                {user.topUps.length === 0 ? (
                  <div className="text-center py-10 md:py-12 text-muted-foreground">
                    <Wallet className="h-10 w-10 md:h-12 md:w-12 mx-auto mb-3 md:mb-4 opacity-50" />
                    <p className="text-sm md:text-base">История пополнений пуста</p>
                  </div>
                ) : (
                  user.topUps.map((topUp, index) => (
                    <motion.div
                      key={topUp.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="p-4 md:p-6 rounded-xl border bg-card flex justify-between gap-4"
                    >
                      <div>
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <h3 className="font-semibold text-sm md:text-base">Пополнение</h3>
                          <Badge variant={topUp.status === 'completed' ? 'default' : 'secondary'} className="text-xs">
                            {topUp.status === 'completed' ? 'Успешно' : 'В обработке'}
                          </Badge>
                        </div>
                        <p className="text-xs md:text-sm text-muted-foreground">{topUp.date}</p>
                        <p className="text-xs md:text-sm text-muted-foreground">{topUp.method}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-base md:text-lg text-success">
                          +{topUp.amount.toLocaleString('ru-RU')} ₽
                        </p>
                      </div>
                    </motion.div>
                  ))
                )}
              </motion.div>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default ProfilePage;
