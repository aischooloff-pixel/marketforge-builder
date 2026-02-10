import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Ban, Shield, Wallet, ShoppingCart, Clock } from 'lucide-react';

interface UserDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: any;
  onToggleBan: (userId: string, isBanned: boolean) => Promise<void>;
  onUpdateRole: (userId: string, role: 'admin' | 'moderator' | 'user') => Promise<boolean>;
  onUpdateBalance: (userId: string, amount: number, action: 'add' | 'set') => Promise<any>;
  onFetchDetails: (userId: string) => Promise<any>;
  isLoading: boolean;
}

export const UserDetailsDialog = ({
  open, onOpenChange, user, onToggleBan, onUpdateRole, onUpdateBalance, onFetchDetails, isLoading
}: UserDetailsDialogProps) => {
  const [details, setDetails] = useState<any>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [balanceAmount, setBalanceAmount] = useState('');
  const [balanceAction, setBalanceAction] = useState<'add' | 'set'>('add');
  const [selectedRole, setSelectedRole] = useState('');

  useEffect(() => {
    if (open && user) {
      loadDetails();
      setSelectedRole(user.user_roles?.[0]?.role || 'user');
    }
  }, [open, user]);

  const loadDetails = async () => {
    if (!user) return;
    setDetailsLoading(true);
    const data = await onFetchDetails(user.id);
    if (data) setDetails(data);
    setDetailsLoading(false);
  };

  const handleBalanceUpdate = async () => {
    if (!user || !balanceAmount) return;
    await onUpdateBalance(user.id, parseFloat(balanceAmount), balanceAction);
    setBalanceAmount('');
    loadDetails();
  };

  const handleRoleChange = async (role: string) => {
    if (!user) return;
    setSelectedRole(role);
    await onUpdateRole(user.id, role as 'admin' | 'moderator' | 'user');
  };

  if (!user) return null;

  const formatDate = (d: string) => new Date(d).toLocaleDateString('ru-RU', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {user.username ? `@${user.username}` : user.first_name}
            {user.is_banned && <Badge variant="destructive" className="text-xs">Забанен</Badge>}
          </DialogTitle>
        </DialogHeader>

        {detailsLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : (
          <Tabs defaultValue="info" className="space-y-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="info" className="text-xs">Инфо</TabsTrigger>
              <TabsTrigger value="balance" className="text-xs">Баланс</TabsTrigger>
              <TabsTrigger value="orders" className="text-xs">Заказы</TabsTrigger>
              <TabsTrigger value="history" className="text-xs">История</TabsTrigger>
            </TabsList>

            <TabsContent value="info" className="space-y-4">
              <Card className="p-4 space-y-2">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="text-muted-foreground">Telegram ID:</span></div>
                  <div className="font-mono">{user.telegram_id}</div>
                  <div><span className="text-muted-foreground">Username:</span></div>
                  <div>{user.username || '—'}</div>
                  <div><span className="text-muted-foreground">Имя:</span></div>
                  <div>{user.first_name || '—'}</div>
                  <div><span className="text-muted-foreground">Баланс:</span></div>
                  <div className="font-bold">{parseFloat(String(user.balance)).toLocaleString('ru-RU')} ₽</div>
                  <div><span className="text-muted-foreground">Регистрация:</span></div>
                  <div className="text-xs">{formatDate(user.created_at)}</div>
                </div>
              </Card>

              {/* Role */}
              <Card className="p-4 space-y-3">
                <p className="text-sm font-medium flex items-center gap-2">
                  <Shield className="h-4 w-4" /> Роль
                </p>
                <Select value={selectedRole} onValueChange={handleRoleChange} disabled={isLoading}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">Пользователь</SelectItem>
                    <SelectItem value="moderator">Модератор</SelectItem>
                    <SelectItem value="admin">Администратор</SelectItem>
                  </SelectContent>
                </Select>
              </Card>

              {/* Ban */}
              <Button
                variant={user.is_banned ? 'default' : 'destructive'}
                className="w-full gap-2"
                onClick={() => onToggleBan(user.id, user.is_banned)}
                disabled={isLoading}
              >
                <Ban className="h-4 w-4" />
                {user.is_banned ? 'Разбанить' : 'Забанить'}
              </Button>
            </TabsContent>

            <TabsContent value="balance" className="space-y-4">
              <Card className="p-4 text-center">
                <p className="text-sm text-muted-foreground">Текущий баланс</p>
                <p className="text-3xl font-bold">
                  {parseFloat(String(details?.profile?.balance || user.balance)).toLocaleString('ru-RU')} ₽
                </p>
              </Card>

              <Card className="p-4 space-y-3">
                <p className="text-sm font-medium flex items-center gap-2">
                  <Wallet className="h-4 w-4" /> Изменить баланс
                </p>
                <div className="flex gap-2">
                  <Select value={balanceAction} onValueChange={(v) => setBalanceAction(v as 'add' | 'set')}>
                    <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="add">Добавить</SelectItem>
                      <SelectItem value="set">Установить</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    placeholder="Сумма"
                    value={balanceAmount}
                    onChange={(e) => setBalanceAmount(e.target.value)}
                  />
                </div>
                <Button
                  className="w-full"
                  disabled={!balanceAmount || isLoading}
                  onClick={handleBalanceUpdate}
                >
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Применить'}
                </Button>
              </Card>
            </TabsContent>

            <TabsContent value="orders" className="space-y-2">
              {!details?.orders?.length ? (
                <p className="text-center text-sm text-muted-foreground py-6">Нет заказов</p>
              ) : (
                details.orders.map((o: any) => (
                  <Card key={o.id} className="p-3">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-mono text-xs">#{o.id.slice(0, 8)}</span>
                      <Badge variant={o.status === 'completed' ? 'default' : 'outline'} className="text-xs">
                        {o.status}
                      </Badge>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{formatDate(o.created_at)}</span>
                      <span className="font-bold">{parseFloat(o.total).toLocaleString('ru-RU')} ₽</span>
                    </div>
                    {o.order_items?.length > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {o.order_items.map((i: any) => i.product_name).join(', ')}
                      </p>
                    )}
                  </Card>
                ))
              )}
            </TabsContent>

            <TabsContent value="history" className="space-y-2">
              {!details?.transactions?.length ? (
                <p className="text-center text-sm text-muted-foreground py-6">Нет транзакций</p>
              ) : (
                details.transactions.map((t: any) => (
                  <Card key={t.id} className="p-3">
                    <div className="flex justify-between items-center">
                      <div>
                        <Badge variant="outline" className="text-xs">{t.type}</Badge>
                        <p className="text-xs text-muted-foreground mt-1">{t.description}</p>
                      </div>
                      <div className="text-right">
                        <p className={`font-bold text-sm ${t.type === 'purchase' ? 'text-destructive' : 'text-primary'}`}>
                          {t.type === 'purchase' ? '-' : '+'}{Math.abs(t.amount).toLocaleString('ru-RU')} ₽
                        </p>
                        <p className="text-xs text-muted-foreground">{formatDate(t.created_at)}</p>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
};
