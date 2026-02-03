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
      
      <main className="flex-1 pt-20">
        <div className="container mx-auto px-4 py-8">
          {/* Profile Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col md:flex-row gap-6 items-start md:items-center mb-8 p-6 rounded-xl border bg-card"
          >
            {/* Avatar */}
            <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center text-3xl font-bold">
              {user.nickname.charAt(0).toUpperCase()}
            </div>

            {/* Info */}
            <div className="flex-1">
              <h1 className="text-2xl font-bold">{user.nickname}</h1>
              <p className="text-muted-foreground">ID: {user.id}</p>
            </div>

            {/* Balance */}
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Баланс</p>
                <p className="text-2xl font-bold">{user.balance.toLocaleString('ru-RU')} ₽</p>
              </div>
              <Dialog open={isTopUpOpen} onOpenChange={setIsTopUpOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Wallet className="h-4 w-4" />
                    Пополнить
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Пополнение баланса</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-6 pt-4">
                    {/* Amount */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Сумма пополнения</label>
                      <Input
                        type="number"
                        placeholder="Минимум 100 ₽"
                        value={topUpAmount}
                        onChange={(e) => setTopUpAmount(e.target.value)}
                        min={100}
                      />
                      <div className="flex gap-2">
                        {[500, 1000, 3000, 5000].map(amount => (
                          <Button
                            key={amount}
                            variant="outline"
                            size="sm"
                            onClick={() => setTopUpAmount(amount.toString())}
                          >
                            {amount} ₽
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
                            className={`flex items-center gap-4 p-4 rounded-lg border transition-all ${
                              selectedMethod === method.id
                                ? 'border-foreground bg-secondary'
                                : 'border-border hover:border-foreground/50'
                            }`}
                          >
                            <method.icon className="h-5 w-5" />
                            <div className="text-left">
                              <p className="font-medium">{method.name}</p>
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
          <Tabs defaultValue="orders" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2 max-w-md">
              <TabsTrigger value="orders" className="gap-2">
                <Package className="h-4 w-4" />
                Заказы
              </TabsTrigger>
              <TabsTrigger value="topups" className="gap-2">
                <Clock className="h-4 w-4" />
                Пополнения
              </TabsTrigger>
            </TabsList>

            {/* Orders Tab */}
            <TabsContent value="orders">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-4"
              >
                {user.orders.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>У вас пока нет заказов</p>
                  </div>
                ) : (
                  user.orders.map((order, index) => (
                    <motion.div
                      key={order.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="p-6 rounded-xl border bg-card"
                    >
                      <div className="flex flex-col sm:flex-row justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold">Заказ #{order.id}</h3>
                            <Badge variant={order.status === 'completed' ? 'default' : 'secondary'}>
                              {order.status === 'completed' ? 'Выполнен' : 
                               order.status === 'pending' ? 'В обработке' : 'Отменён'}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{order.date}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-lg">{order.total.toLocaleString('ru-RU')} ₽</p>
                        </div>
                      </div>
                      <div className="mt-4 pt-4 border-t">
                        <ul className="space-y-2">
                          {order.items.map((item, i) => (
                            <li key={i} className="flex justify-between text-sm">
                              <span>{item.name}</span>
                              <span className="text-muted-foreground">{item.price.toLocaleString('ru-RU')} ₽</span>
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
                className="space-y-4"
              >
                {user.topUps.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Wallet className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>История пополнений пуста</p>
                  </div>
                ) : (
                  user.topUps.map((topUp, index) => (
                    <motion.div
                      key={topUp.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="p-6 rounded-xl border bg-card flex flex-col sm:flex-row justify-between gap-4"
                    >
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="font-semibold">Пополнение</h3>
                          <Badge variant={topUp.status === 'completed' ? 'default' : 'secondary'}>
                            {topUp.status === 'completed' ? 'Успешно' : 'В обработке'}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{topUp.date}</p>
                        <p className="text-sm text-muted-foreground">{topUp.method}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg text-success">
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
