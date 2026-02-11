import { useState } from 'react';
import { useTelegram } from '@/contexts/TelegramContext';
import { useOrders } from '@/hooks/useOrders';
import { useTransactions, getTransactionTypeLabel, isPositiveTransaction } from '@/hooks/useTransactions';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { motion } from 'framer-motion';
import { User, Wallet, Package, Clock, Loader2, Copy, Check, Eye, EyeOff, Phone, TrendingUp } from 'lucide-react';
import { VirtualNumbersTab } from '@/components/VirtualNumbersTab';
import { BoostOrdersTab } from '@/components/BoostOrdersTab';
import SupportDialog from '@/components/SupportDialog';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import cryptoBotLogo from '@/assets/cryptobot-logo.jpg';

const ProfilePage = () => {
  const { user, isAuthenticated, isLoading: authLoading, webApp } = useTelegram();
  const { data: orders = [], isLoading: ordersLoading } = useOrders();
  const { data: transactions = [], isLoading: transactionsLoading } = useTransactions();
  
  const searchParams = new URLSearchParams(window.location.search);
  const initialTab = searchParams.get('tab') || (() => {
    const sp = (window.Telegram?.WebApp as any)?.initDataUnsafe?.start_param;
    return sp === 'numbers' || sp === 'review' ? 'numbers' : 'orders';
  })();
  const [activeTab, setActiveTab] = useState(initialTab);
  const [topUpAmount, setTopUpAmount] = useState('');
  const [isTopUpOpen, setIsTopUpOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [copiedOrderId, setCopiedOrderId] = useState<string | null>(null);
  const [visibleContent, setVisibleContent] = useState<Record<string, boolean>>({});

  const handleTopUp = async () => {
    const amount = parseInt(topUpAmount);
    if (!amount || amount < 100 || !user) return;

    setIsProcessing(true);

    try {
      const { data, error } = await supabase.functions.invoke('cryptobot-create-invoice', {
        body: {
          userId: user.id,
          amount,
          description: `Пополнение баланса на ${amount} ₽`,
        },
      });

      if (error || !data?.success) {
        throw new Error(data?.error || 'Ошибка создания счёта');
      }

      // Open CryptoBot payment
      if (webApp && data.miniAppUrl) {
        webApp.openTelegramLink(data.miniAppUrl);
      } else if (data.payUrl) {
        window.open(data.payUrl, '_blank');
      }

      toast.success('Счёт создан! Оплатите в CryptoBot.');
      setIsTopUpOpen(false);
      setTopUpAmount('');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Ошибка';
      toast.error(message);
    } finally {
      setIsProcessing(false);
    }
  };

  const copyToClipboard = (text: string, orderId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedOrderId(orderId);
    toast.success('Скопировано в буфер обмена');
    setTimeout(() => setCopiedOrderId(null), 2000);
  };

  const toggleContentVisibility = (orderId: string) => {
    setVisibleContent(prev => ({ ...prev, [orderId]: !prev[orderId] }));
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
      completed: { variant: 'default', label: 'Выполнен' },
      paid: { variant: 'secondary', label: 'Оплачен' },
      pending: { variant: 'outline', label: 'Не оплачен' },
      cancelled: { variant: 'destructive', label: 'Отменён' },
      refunded: { variant: 'secondary', label: 'Возвращён' },
    };
    const config = statusConfig[status] || { variant: 'outline' as const, label: status };
    return <Badge variant={config.variant} className="text-xs">{config.label}</Badge>;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Loading state
  if (authLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 pt-20 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </main>
        <Footer />
      </div>
    );
  }

  // Not authenticated
  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 pt-20 flex items-center justify-center">
          <div className="text-center">
            <User className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h1 className="text-2xl font-bold mb-2">Войдите в аккаунт</h1>
            <p className="text-muted-foreground">
              Откройте приложение через Telegram для авторизации
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
              {user.photo_url ? (
                <img 
                  src={user.photo_url} 
                  alt={user.first_name}
                  className="w-14 h-14 md:w-20 md:h-20 rounded-full object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-14 h-14 md:w-20 md:h-20 rounded-full bg-secondary flex items-center justify-center text-xl md:text-3xl font-bold flex-shrink-0">
                  {user.first_name.charAt(0).toUpperCase()}
                </div>
              )}

              {/* Info */}
              <div className="flex-1 min-w-0">
                <h1 className="text-lg md:text-2xl font-bold truncate">
                  {user.username ? `@${user.username}` : user.first_name}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {user.first_name} {user.last_name || ''}
                </p>
                <p className="text-xs text-muted-foreground">ID: {user.telegram_id}</p>
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
                <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md max-h-[80vh] overflow-y-auto">
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

                    {/* CryptoBot Payment */}
                    <div className="p-3 rounded-lg border border-foreground bg-secondary flex items-center gap-3">
                      <img 
                        src={cryptoBotLogo} 
                        alt="CryptoBot" 
                        className="w-8 h-8 rounded-full"
                      />
                      <div className="text-left">
                        <p className="font-medium text-sm">CryptoBot</p>
                        <p className="text-xs text-muted-foreground">USDT, TON, BTC, ETH</p>
                      </div>
                    </div>

                    {/* Submit */}
                    <Button
                      className="w-full gap-2"
                      disabled={!topUpAmount || parseInt(topUpAmount) < 100 || isProcessing}
                      onClick={handleTopUp}
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Создание счёта...
                        </>
                      ) : (
                        <>
                          <img 
                            src={cryptoBotLogo} 
                            alt="" 
                            className="w-4 h-4 rounded-full"
                          />
                          Пополнить на {topUpAmount || '0'} ₽
                        </>
                      )}
                    </Button>

                    <p className="text-xs text-muted-foreground text-center">
                      Средства будут зачислены мгновенно после подтверждения платежа
                    </p>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </motion.div>

          {/* Support Button */}
          <div className="mb-6">
            <SupportDialog />
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 md:space-y-6">
            <TabsList className="w-full max-w-none grid grid-cols-4 h-10">
              <TabsTrigger value="orders" className="gap-1.5 text-xs md:text-sm">
                <Package className="h-3.5 w-3.5 md:h-4 md:w-4" />
                <span className="hidden sm:inline">Заказы</span>
                <span className="sm:hidden">📦</span>
              </TabsTrigger>
              <TabsTrigger value="numbers" className="gap-1.5 text-xs md:text-sm">
                <Phone className="h-3.5 w-3.5 md:h-4 md:w-4" />
                <span className="hidden sm:inline">Номера</span>
                <span className="sm:hidden">📱</span>
              </TabsTrigger>
              <TabsTrigger value="boosts" className="gap-1.5 text-xs md:text-sm">
                <TrendingUp className="h-3.5 w-3.5 md:h-4 md:w-4" />
                <span className="hidden sm:inline">Накрутки</span>
                <span className="sm:hidden">🚀</span>
              </TabsTrigger>
              <TabsTrigger value="transactions" className="gap-1.5 text-xs md:text-sm">
                <Clock className="h-3.5 w-3.5 md:h-4 md:w-4" />
                <span className="hidden sm:inline">История</span>
                <span className="sm:hidden">💰</span>
              </TabsTrigger>
            </TabsList>

            {/* Orders Tab */}
            <TabsContent value="orders">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-3"
              >
                {ordersLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="p-4 rounded-xl border bg-card">
                        <Skeleton className="h-5 w-32 mb-2" />
                        <Skeleton className="h-4 w-24 mb-3" />
                        <Skeleton className="h-4 w-full" />
                      </div>
                    ))}
                  </div>
                ) : orders.length === 0 ? (
                  <div className="text-center py-10 md:py-12 text-muted-foreground">
                    <Package className="h-10 w-10 md:h-12 md:w-12 mx-auto mb-3 md:mb-4 opacity-50" />
                    <p className="text-sm md:text-base">У вас пока нет заказов</p>
                  </div>
                ) : (
                  orders.map((order, index) => (
                    <motion.div
                      key={order.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="p-4 md:p-6 rounded-xl border bg-card"
                    >
                      <div className="flex justify-between gap-3 mb-3">
                        <div>
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <h3 className="font-semibold text-sm md:text-base font-mono">
                              #{order.id.slice(0, 8)}
                            </h3>
                            {getStatusBadge(order.status)}
                          </div>
                          <p className="text-xs md:text-sm text-muted-foreground">
                            {formatDate(order.created_at)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-base md:text-lg">
                            {parseFloat(String(order.total)).toLocaleString('ru-RU')} ₽
                          </p>
                        </div>
                      </div>

                      {/* Order Items */}
                      <div className="pt-3 border-t">
                        <ul className="space-y-1.5">
                          {order.order_items.map((item) => (
                            <li key={item.id} className="flex justify-between text-xs md:text-sm">
                              <span className="truncate flex-1 mr-2">
                                {item.product_name}
                                {item.quantity > 1 && (
                                  <span className="text-muted-foreground"> × {item.quantity}</span>
                                )}
                              </span>
                              <span className="text-muted-foreground flex-shrink-0">
                                {parseFloat(String(item.price)).toLocaleString('ru-RU')} ₽
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Delivered Content */}
                      {order.status === 'completed' && order.delivered_content && (
                        <div className="mt-3 pt-3 border-t">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-xs font-medium text-muted-foreground">Ваш товар:</p>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => toggleContentVisibility(order.id)}
                              >
                                {visibleContent[order.id] ? (
                                  <EyeOff className="h-3.5 w-3.5" />
                                ) : (
                                  <Eye className="h-3.5 w-3.5" />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => copyToClipboard(order.delivered_content!, order.id)}
                              >
                                {copiedOrderId === order.id ? (
                                  <Check className="h-3.5 w-3.5 text-primary" />
                                ) : (
                                  <Copy className="h-3.5 w-3.5" />
                                )}
                              </Button>
                            </div>
                          </div>
                          <div className="p-2 rounded-lg bg-secondary/50 font-mono text-xs break-all">
                            {visibleContent[order.id] 
                              ? order.delivered_content 
                              : '••••••••••••••••••••'
                            }
                          </div>
                        </div>
                      )}
                    </motion.div>
                  ))
                )}
              </motion.div>
            </TabsContent>

            {/* Virtual Numbers Tab */}
            <TabsContent value="numbers">
              <VirtualNumbersTab />
            </TabsContent>

            {/* Boost Orders Tab */}
            <TabsContent value="boosts">
              <BoostOrdersTab />
            </TabsContent>

            {/* Transactions Tab */}
            <TabsContent value="transactions">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-3"
              >
                {transactionsLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="p-4 rounded-xl border bg-card">
                        <Skeleton className="h-5 w-32 mb-2" />
                        <Skeleton className="h-4 w-24" />
                      </div>
                    ))}
                  </div>
                ) : transactions.length === 0 ? (
                  <div className="text-center py-10 md:py-12 text-muted-foreground">
                    <Wallet className="h-10 w-10 md:h-12 md:w-12 mx-auto mb-3 md:mb-4 opacity-50" />
                    <p className="text-sm md:text-base">История транзакций пуста</p>
                  </div>
                ) : (
                  transactions.map((transaction, index) => (
                    <motion.div
                      key={transaction.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="p-4 md:p-6 rounded-xl border bg-card flex justify-between gap-4"
                    >
                      <div>
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <h3 className="font-semibold text-sm md:text-base">
                            {getTransactionTypeLabel(transaction.type)}
                          </h3>
                          <Badge variant="outline" className="text-xs">
                            {transaction.type}
                          </Badge>
                        </div>
                        <p className="text-xs md:text-sm text-muted-foreground">
                          {formatDate(transaction.created_at)}
                        </p>
                        {transaction.description && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {transaction.description}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className={`font-bold text-base md:text-lg ${
                          isPositiveTransaction(transaction.type) 
                            ? 'text-primary' 
                            : 'text-destructive'
                        }`}>
                          {isPositiveTransaction(transaction.type) ? '+' : '-'}
                          {Math.abs(transaction.amount).toLocaleString('ru-RU')} ₽
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Баланс: {parseFloat(String(transaction.balance_after)).toLocaleString('ru-RU')} ₽
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
