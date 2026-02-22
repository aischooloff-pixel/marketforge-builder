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
import { Loader2 } from 'lucide-react';
import { PxUser, PxCart, PxFolder, PxComputer, PxPlus, PxCheck } from '@/components/PixelIcons';
import { VirtualNumbersTab } from '@/components/VirtualNumbersTab';
import SupportDialog from '@/components/SupportDialog';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import cryptoBotLogo from '@/assets/cryptobot-logo.jpg';
import xrocketLogo from '@/assets/xrocket-logo.jpg';

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
  const [topUpMethod, setTopUpMethod] = useState<'cryptobot' | 'xrocket'>('cryptobot');

  const handleTopUp = async () => {
    const amount = parseInt(topUpAmount);
    if (!amount || amount < 100 || !user) return;

    setIsProcessing(true);

    try {
      const functionName = topUpMethod === 'xrocket' ? 'xrocket-create-invoice' : 'cryptobot-create-invoice';
      
      const { data, error } = await supabase.functions.invoke(functionName, {
        body: {
          initData: webApp?.initData,
          amount,
          description: `Пополнение баланса на ${amount} ₽`,
        },
      });

      if (error || !data?.success) {
        throw new Error(data?.error || 'Ошибка создания счёта');
      }

      const payLink = data.miniAppUrl || data.payUrl || data.payUrl;
      if (webApp && payLink && payLink.includes('t.me')) {
        webApp.openTelegramLink(payLink);
      } else if (payLink) {
        window.open(payLink, '_blank');
      }

      const methodName = topUpMethod === 'xrocket' ? 'xRocket' : 'CryptoBot';
      toast.success(`Счёт создан! Оплатите в ${methodName}.`);
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
    const statusConfig: Record<string, { label: string; className: string }> = {
      completed: { label: '✓ Выполнен', className: 'bg-primary/20 text-primary border-primary/40' },
      paid: { label: '● Оплачен', className: 'bg-accent/20 text-accent-foreground border-accent/40' },
      pending: { label: '○ Не оплачен', className: 'bg-muted text-muted-foreground border-border' },
      cancelled: { label: '✕ Отменён', className: 'bg-destructive/20 text-destructive border-destructive/40' },
      refunded: { label: '↩ Возвращён', className: 'bg-muted text-muted-foreground border-border' },
    };
    const config = statusConfig[status] || { label: status, className: 'bg-muted text-muted-foreground border-border' };
    return <span className={`inline-block px-2 py-0.5 text-[10px] font-pixel border ${config.className}`}>{config.label}</span>;
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
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 pt-20 flex items-center justify-center">
          <div className="win95-window p-8">
            <div className="win95-titlebar px-2 py-1 mb-4">
              <span className="font-pixel text-[10px]">загрузка...</span>
            </div>
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Not authenticated
  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 pt-20 flex items-center justify-center">
          <div className="win95-window max-w-sm w-full mx-4">
            <div className="win95-titlebar px-2 py-1">
              <span className="font-pixel text-[10px]">⚠ авторизация</span>
            </div>
            <div className="p-6 text-center">
              <PxUser size={48} className="mx-auto mb-4 text-muted-foreground" />
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
        <div className="container mx-auto px-3 py-4 md:px-4 md:py-8 max-w-4xl">
          {/* Profile Header - Win95 Window */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="win95-window mb-4"
          >
            <div className="win95-titlebar px-2 py-1">
              <span className="flex items-center gap-1">
                <PxUser size={12} />
                <span className="font-pixel text-[10px]">профиль пользователя</span>
              </span>
              <div className="flex gap-0.5">
                <span className="bevel-raised bg-card h-4 w-4 flex items-center justify-center text-foreground text-[8px]">_</span>
                <span className="bevel-raised bg-card h-4 w-4 flex items-center justify-center text-foreground text-[8px]">□</span>
              </div>
            </div>
            
            <div className="p-4">
              {/* Top row: Avatar + Info */}
              <div className="flex items-center gap-4 mb-4">
                {/* Avatar - pixel style */}
                <div className="bevel-sunken p-1 flex-shrink-0">
                  {user.photo_url ? (
                    <img 
                      src={user.photo_url} 
                      alt={user.first_name}
                      className="w-14 h-14 md:w-16 md:h-16 object-cover"
                      style={{ imageRendering: 'auto' }}
                    />
                  ) : (
                    <div className="w-14 h-14 md:w-16 md:h-16 bg-secondary flex items-center justify-center font-pixel text-lg text-primary">
                      {user.first_name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h1 className="text-base md:text-lg font-pixel truncate text-primary">
                    {user.username ? `@${user.username}` : user.first_name}
                  </h1>
                  <p className="text-xs text-muted-foreground font-mono">
                    {user.first_name} {user.last_name || ''}
                  </p>
                  <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
                    TG_ID: {user.telegram_id}
                  </p>
                </div>
              </div>

              {/* Balance row - bevel sunken */}
              <div className="bevel-sunken p-3 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-pixel text-muted-foreground">БАЛАНС:</p>
                  <p className="text-lg md:text-xl font-pixel text-primary">
                    {user.balance.toLocaleString('ru-RU')} ₽
                  </p>
                </div>
                <Dialog open={isTopUpOpen} onOpenChange={setIsTopUpOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="bevel-raised gap-1 font-pixel text-[10px] h-8">
                      <PxPlus size={12} />
                      ПОПОЛНИТЬ
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="win95-window max-w-[calc(100vw-2rem)] sm:max-w-md p-0 border-0 bg-transparent">
                    <div className="win95-titlebar px-2 py-1">
                      <span className="font-pixel text-[10px]">💰 пополнение баланса</span>
                    </div>
                    <div className="bg-card p-4 space-y-4">
                      {/* Amount */}
                      <div className="space-y-2">
                        <label className="text-[10px] font-pixel text-muted-foreground">СУММА:</label>
                        <Input
                          type="number"
                          placeholder="Минимум 100 ₽"
                          value={topUpAmount}
                          onChange={(e) => setTopUpAmount(e.target.value)}
                          min={100}
                          className="bevel-sunken border-0 font-mono h-9"
                        />
                        <div className="grid grid-cols-4 gap-1">
                          {[500, 1000, 3000, 5000].map(amount => (
                            <button
                              key={amount}
                              onClick={() => setTopUpAmount(amount.toString())}
                              className="bevel-raised bg-card px-1 py-1 text-[10px] font-pixel hover:bg-muted active:bevel-sunken"
                            >
                              {amount}₽
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Payment Method Selection */}
                      <div className="space-y-2">
                        <label className="text-[10px] font-pixel text-muted-foreground">СПОСОБ ОПЛАТЫ:</label>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setTopUpMethod('cryptobot')}
                            className={`bevel-raised p-2 flex items-center gap-2 ${
                              topUpMethod === 'cryptobot' ? 'bevel-sunken bg-primary/10' : 'bg-card hover:bg-muted'
                            }`}
                          >
                            <img src={cryptoBotLogo} alt="CryptoBot" className="w-7 h-7 rounded-sm" />
                            <div className="text-left">
                              <p className="font-pixel text-[9px]">CryptoBot</p>
                              <p className="text-[8px] text-muted-foreground font-mono">USDT, TON</p>
                            </div>
                          </button>
                          <button
                            type="button"
                            onClick={() => setTopUpMethod('xrocket')}
                            className={`bevel-raised p-2 flex items-center gap-2 ${
                              topUpMethod === 'xrocket' ? 'bevel-sunken bg-primary/10' : 'bg-card hover:bg-muted'
                            }`}
                          >
                            <img src={xrocketLogo} alt="xRocket" className="w-7 h-7 rounded-sm" />
                            <div className="text-left">
                              <p className="font-pixel text-[9px]">xRocket</p>
                              <p className="text-[8px] text-muted-foreground font-mono">USDT</p>
                            </div>
                          </button>
                        </div>
                      </div>

                      {/* Submit */}
                      <Button
                        className="w-full bevel-raised font-pixel text-[10px] gap-2"
                        disabled={!topUpAmount || parseInt(topUpAmount) < 100 || isProcessing}
                        onClick={handleTopUp}
                      >
                        {isProcessing ? (
                          <>
                            <Loader2 className="h-3 w-3 animate-spin" />
                            СОЗДАНИЕ СЧЁТА...
                          </>
                        ) : (
                          <>
                            <img 
                              src={topUpMethod === 'xrocket' ? xrocketLogo : cryptoBotLogo} 
                              alt="" 
                              className="w-4 h-4 rounded-sm"
                            />
                            ПОПОЛНИТЬ НА {topUpAmount || '0'} ₽
                          </>
                        )}
                      </Button>

                      <p className="text-[9px] text-muted-foreground text-center font-mono">
                        Средства зачислятся мгновенно после подтверждения
                      </p>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </motion.div>

          {/* Support Button - Win95 style */}
          <div className="mb-4">
            <SupportDialog />
          </div>

          {/* Tabs - Win95 style */}
          <div className="win95-window">
            <div className="win95-titlebar px-2 py-1">
              <span className="flex items-center gap-1">
                <PxFolder size={12} />
                <span className="font-pixel text-[10px]">данные аккаунта</span>
              </span>
            </div>
            
            <Tabs value={activeTab} onValueChange={setActiveTab} className="p-2">
              <TabsList className="w-full max-w-none grid grid-cols-3 h-8 bevel-sunken bg-card p-0.5 rounded-none">
                <TabsTrigger value="orders" className="font-pixel text-[9px] gap-1 rounded-none data-[state=active]:bevel-raised data-[state=active]:bg-muted">
                  📦 Заказы
                </TabsTrigger>
                <TabsTrigger value="numbers" className="font-pixel text-[9px] gap-1 rounded-none data-[state=active]:bevel-raised data-[state=active]:bg-muted">
                  📱 Номера
                </TabsTrigger>
                <TabsTrigger value="transactions" className="font-pixel text-[9px] gap-1 rounded-none data-[state=active]:bevel-raised data-[state=active]:bg-muted">
                  💰 История
                </TabsTrigger>
              </TabsList>

              {/* Orders Tab */}
              <TabsContent value="orders" className="mt-2">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-2"
                >
                  {ordersLoading ? (
                    <div className="space-y-2">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="bevel-sunken p-3">
                          <Skeleton className="h-4 w-32 mb-2" />
                          <Skeleton className="h-3 w-24 mb-2" />
                          <Skeleton className="h-3 w-full" />
                        </div>
                      ))}
                    </div>
                  ) : orders.filter(o => o.order_items && o.order_items.length > 0).length === 0 ? (
                    <div className="bevel-sunken p-8 text-center text-muted-foreground">
                      <PxCart size={32} className="mx-auto mb-3 opacity-50" />
                      <p className="font-pixel text-[10px]">НЕТ ЗАКАЗОВ</p>
                    </div>
                  ) : (
                    orders.filter(o => o.order_items && o.order_items.length > 0).map((order, index) => (
                      <motion.div
                        key={order.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="bevel-sunken p-3"
                      >
                        <div className="flex justify-between gap-2 mb-2">
                          <div>
                            <div className="flex flex-wrap items-center gap-2 mb-0.5">
                              <h3 className="font-pixel text-[10px] text-primary">
                                #{order.id.slice(0, 8)}
                              </h3>
                              {getStatusBadge(order.status)}
                            </div>
                            <p className="text-[10px] text-muted-foreground font-mono">
                              {formatDate(order.created_at)}
                            </p>
                          </div>
                          <div className="text-right whitespace-nowrap">
                            <p className="font-pixel text-sm text-primary">
                              {parseFloat(String(order.total)).toLocaleString('ru-RU')} ₽
                            </p>
                          </div>
                        </div>

                        {/* Order Items */}
                        <div className="pt-2 border-t border-border">
                          <ul className="space-y-1">
                            {order.order_items.map((item) => (
                              <li key={item.id} className="flex justify-between text-[11px] font-mono">
                                <span className="truncate flex-1 mr-2">
                                  {item.product_name}
                                  {item.quantity > 1 && (
                                    <span className="text-muted-foreground"> ×{item.quantity}</span>
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
                          <div className="mt-2 pt-2 border-t border-border">
                            <div className="flex items-center justify-between mb-1">
                              <p className="text-[9px] font-pixel text-muted-foreground">ВАШ ТОВАР:</p>
                              <div className="flex gap-0.5">
                                <button
                                  className="bevel-raised bg-card h-5 w-5 flex items-center justify-center text-[10px] active:bevel-sunken"
                                  onClick={() => toggleContentVisibility(order.id)}
                                >
                                  {visibleContent[order.id] ? '🙈' : '👁'}
                                </button>
                                <button
                                  className="bevel-raised bg-card h-5 w-5 flex items-center justify-center text-[10px] active:bevel-sunken"
                                  onClick={() => copyToClipboard(order.delivered_content!, order.id)}
                                >
                                  {copiedOrderId === order.id ? '✓' : '📋'}
                                </button>
                              </div>
                            </div>
                            <div className="bevel-sunken p-2 font-mono text-[10px] break-all bg-secondary/30">
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
              <TabsContent value="numbers" className="mt-2">
                <VirtualNumbersTab />
              </TabsContent>

              {/* Transactions Tab */}
              <TabsContent value="transactions" className="mt-2">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-2"
                >
                  {transactionsLoading ? (
                    <div className="space-y-2">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="bevel-sunken p-3">
                          <Skeleton className="h-4 w-32 mb-2" />
                          <Skeleton className="h-3 w-24" />
                        </div>
                      ))}
                    </div>
                  ) : transactions.length === 0 ? (
                    <div className="bevel-sunken p-8 text-center text-muted-foreground">
                      <PxComputer size={32} className="mx-auto mb-3 opacity-50" />
                      <p className="font-pixel text-[10px]">ИСТОРИЯ ПУСТА</p>
                    </div>
                  ) : (
                    transactions.map((transaction, index) => (
                      <motion.div
                        key={transaction.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="bevel-sunken p-3 flex justify-between gap-3"
                      >
                        <div>
                          <div className="flex flex-wrap items-center gap-2 mb-0.5">
                            <h3 className="font-pixel text-[10px]">
                              {getTransactionTypeLabel(transaction.type)}
                            </h3>
                            <span className="text-[8px] font-mono text-muted-foreground bevel-sunken px-1">
                              {transaction.type}
                            </span>
                          </div>
                          <p className="text-[10px] text-muted-foreground font-mono">
                            {formatDate(transaction.created_at)}
                          </p>
                          {transaction.description && (
                            <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
                              {transaction.description}
                            </p>
                          )}
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className={`font-pixel text-sm ${
                            isPositiveTransaction(transaction.type) 
                              ? 'text-primary' 
                              : 'text-destructive'
                          }`}>
                            {isPositiveTransaction(transaction.type) ? '+' : '-'}
                            {Math.abs(transaction.amount).toLocaleString('ru-RU')} ₽
                          </p>
                          <p className="text-[9px] text-muted-foreground font-mono">
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
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default ProfilePage;
