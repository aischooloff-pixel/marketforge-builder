import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTelegram } from '@/contexts/TelegramContext';
import { useAdmin } from '@/hooks/useAdmin';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ProductFormDialog } from '@/components/admin/ProductFormDialog';
import { ProductItemsDialog } from '@/components/admin/ProductItemsDialog';
import { CategoryFormDialog } from '@/components/admin/CategoryFormDialog';
import { PromoFormDialog } from '@/components/admin/PromoFormDialog';
import { StatsCharts } from '@/components/admin/StatsCharts';
import { SupportTicketsTab } from '@/components/admin/SupportTicketsTab';
import { ReviewsTab } from '@/components/admin/ReviewsTab';
import { BroadcastTab } from '@/components/admin/BroadcastTab';
import { UserDetailsDialog } from '@/components/admin/UserDetailsDialog';
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  Users, 
  Plus,
  Edit,
  Ban,
  Shield,
  ArrowLeft,
  Search,
  Loader2,
  Ticket,
  Trash2,
  Upload,
  FolderOpen,
  MessageCircle,
  Eye,
  Star,
  Send,
  ChevronDown,
  ChevronUp,
  ExternalLink
} from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface Stats {
  users: number;
  orders: number;
  revenue: number;
  products: number;
}

interface Product {
  id: string;
  name: string;
  short_desc?: string;
  long_desc?: string;
  price: number;
  type: string;
  is_active: boolean;
  is_popular: boolean;
  category_id?: string;
  tags?: string[];
  media_urls?: string[];
  categories?: { name: string; icon: string };
}

interface Category {
  id: string;
  name: string;
  icon?: string;
  slug: string;
}

interface PromoCode {
  id: string;
  code: string;
  discount_percent: number;
  max_uses: number;
  used_count: number;
  is_active: boolean;
  expires_at?: string;
  created_at: string;
}

interface Order {
  id: string;
  status: string;
  total: number;
  created_at: string;
  delivered_content?: string;
  profiles?: { username: string; first_name: string; telegram_id: number };
  order_items?: Array<{ product_name: string; price: number; quantity: number; options?: Record<string, unknown> }>;
}

interface Deposit {
  id: string;
  amount: number;
  created_at: string;
  description?: string;
  payment_id?: string;
  profiles?: { username: string; first_name: string; telegram_id: number };
}

type TimelineItem = 
  | { type: 'order'; data: Order; created_at: string }
  | { type: 'deposit'; data: Deposit; created_at: string };

interface User {
  id: string;
  telegram_id: number;
  username: string;
  first_name: string;
  balance: number;
  is_banned: boolean;
  created_at: string;
  user_roles?: Array<{ role: string }>;
}

// Expandable order card component
const OrderCard = ({ order, onComplete, onUpdateStatus, isLoading }: {
  order: Order;
  onComplete: () => void;
  onUpdateStatus: (status: 'pending' | 'paid' | 'completed' | 'cancelled' | 'refunded') => void;
  isLoading: boolean;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const hasMultipleItems = (order.order_items?.length || 0) > 1;

  return (
    <Card className="p-4">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/30">
                🛒 Заказ
              </Badge>
              <span className="text-xs text-muted-foreground">#{order.id.slice(0, 8)}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              {order.profiles?.username ? `@${order.profiles.username}` : order.profiles?.first_name}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {new Date(order.created_at).toLocaleString('ru-RU')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-right">
              <p className="font-bold">{parseFloat(String(order.total)).toLocaleString('ru-RU')} ₽</p>
              <Badge
                variant={
                  order.status === 'completed' ? 'default' :
                  order.status === 'paid' ? 'secondary' :
                  'outline'
                }
                className="text-xs"
              >
                {order.status === 'completed' ? 'Выполнен' :
                 order.status === 'paid' ? 'Оплачен' :
                 order.status === 'pending' ? 'Не оплачен' : order.status}
              </Badge>
            </div>
            {(order.order_items?.length || 0) > 0 && (
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
            )}
          </div>
        </div>

        {/* Compact summary when collapsed */}
        {!isOpen && order.order_items && order.order_items.length > 0 && (
          <p className="text-xs text-muted-foreground mb-2">
            {order.order_items.map(i => i.product_name).join(', ')}
            {hasMultipleItems && ` (${order.order_items.length} позиций)`}
          </p>
        )}

        {/* Expanded details */}
        <CollapsibleContent>
          <div className="mt-3 space-y-2 border-t pt-3">
            {order.order_items?.map((item, idx) => {
              const opts = item.options as { country?: string; services?: string[] } | null;
              return (
                <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-secondary/30">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{item.product_name}</p>
                    {opts?.country && (
                      <p className="text-xs text-muted-foreground">Страна: {opts.country}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{parseFloat(String(item.price)).toLocaleString('ru-RU')} ₽</p>
                    {(item.quantity || 1) > 1 && (
                      <p className="text-xs text-muted-foreground">×{item.quantity}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {order.delivered_content && (
            <div className="mt-2 p-2 rounded-lg bg-muted/50 border border-border">
              <p className="text-[10px] font-medium text-muted-foreground mb-1">Содержимое:</p>
              <pre className="text-[10px] text-foreground whitespace-pre-wrap break-all font-mono">{order.delivered_content}</pre>
            </div>
          )}
        </CollapsibleContent>

        {/* Order complete */}
        {order.status === 'paid' && (
          <Button
            size="sm"
            className="w-full mt-2"
            onClick={() => onUpdateStatus('completed')}
            disabled={isLoading}
          >
            Выполнить заказ
          </Button>
        )}
      </Collapsible>
    </Card>
  );
};

const AdminPage = () => {
  const { user, isAdmin, isLoading: authLoading } = useTelegram();
  const navigate = useNavigate();
  const admin = useAdmin();
  
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState<Stats>({ users: 0, orders: 0, revenue: 0, products: 0 });
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [promos, setPromos] = useState<PromoCode[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [dataLoading, setDataLoading] = useState(true);
  const [tickets, setTickets] = useState<any[]>([]);
  const [userDetailsOpen, setUserDetailsOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [passwordInput, setPasswordInput] = useState('');

  // Dialogs state
  const [productFormOpen, setProductFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productItemsOpen, setProductItemsOpen] = useState(false);
  const [selectedProductForItems, setSelectedProductForItems] = useState<Product | null>(null);
  const [categoryFormOpen, setCategoryFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [promoFormOpen, setPromoFormOpen] = useState(false);

  // Check access: either admin role (Telegram) or password auth
  const hasAccess = isAdmin || admin.isPasswordAuthed;

  // Redirect if no access and not loading
  useEffect(() => {
    if (!authLoading && !hasAccess && !admin.isPasswordAuthed) {
      // Don't redirect — show password form instead
    }
  }, [isAdmin, authLoading, hasAccess, admin.isPasswordAuthed]);

  // Load data via admin-api
  useEffect(() => {
    if (hasAccess) {
      loadAllData();
    }
  }, [hasAccess]);

  const loadAllData = async () => {
    setDataLoading(true);
    
    const [statsData, productsData, ordersData, usersData, categoriesData, promosData, ticketsData] = await Promise.all([
      admin.fetchStats(),
      admin.fetchProducts(),
      admin.fetchOrders(),
      admin.fetchUsers(),
      admin.fetchCategories(),
      admin.fetchPromos(),
      admin.fetchTickets(),
    ]);

    if (statsData) setStats(statsData);
    if (productsData) setProducts(productsData);
    if (ordersData) {
      setOrders(ordersData.orders);
      setDeposits(ordersData.deposits);
    }
    if (usersData) setUsers(usersData);
    if (categoriesData) setCategories(categoriesData as Category[]);
    if (promosData) setPromos(promosData as PromoCode[]);
    if (ticketsData) setTickets(ticketsData as any[]);
    
    setDataLoading(false);
  };

  const handleToggleProductActive = async (productId: string, isActive: boolean) => {
    await admin.toggleProductActive(productId, isActive);
    const updated = await admin.fetchProducts();
    if (updated) setProducts(updated);
  };

  const handleUpdateOrderStatus = async (orderId: string, status: 'pending' | 'paid' | 'completed' | 'cancelled' | 'refunded') => {
    await admin.updateOrderStatus(orderId, status);
    const updated = await admin.fetchOrders();
    if (updated) {
      setOrders(updated.orders);
      setDeposits(updated.deposits);
    }
  };


  const handleToggleUserBan = async (userId: string, isBanned: boolean) => {
    await admin.toggleUserBan(userId, isBanned);
    const updated = await admin.fetchUsers();
    if (updated) {
      setUsers(updated);
      // Update selectedUser so the dialog reflects the change
      const refreshed = updated.find(u => u.id === userId);
      if (refreshed && selectedUser?.id === userId) {
        setSelectedUser(refreshed);
      }
    }
  };

  const handleProductSubmit = async (productData: Partial<Product>) => {
    if (editingProduct) {
      await admin.updateProduct(editingProduct.id, productData);
    } else {
      await admin.createProduct(productData);
    }
    const updated = await admin.fetchProducts();
    if (updated) setProducts(updated);
    setEditingProduct(null);
  };

  const handleOpenProductForm = (product?: Product) => {
    setEditingProduct(product || null);
    setProductFormOpen(true);
  };

  const handleOpenProductItems = (product: Product) => {
    setSelectedProductForItems(product);
    setProductItemsOpen(true);
  };

  const handleCategorySubmit = async (categoryData: Partial<Category>) => {
    if (editingCategory) {
      await admin.updateCategory(editingCategory.id, categoryData);
    } else {
      await admin.createCategory(categoryData as { name: string; slug: string; icon?: string; description?: string });
    }
    const updated = await admin.fetchCategories();
    if (updated) setCategories(updated as Category[]);
    setEditingCategory(null);
  };

  const handleOpenCategoryForm = (category?: Category) => {
    setEditingCategory(category || null);
    setCategoryFormOpen(true);
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (!confirm('Удалить категорию? Товары в ней не будут удалены.')) return;
    await admin.deleteCategory(categoryId);
    const updated = await admin.fetchCategories();
    if (updated) setCategories(updated as Category[]);
  };

  const handlePromoSubmit = async (promoData: { code: string; discount_percent: number; max_uses: number; expires_at?: string }) => {
    await admin.createPromo(promoData);
    const updated = await admin.fetchPromos();
    if (updated) setPromos(updated as PromoCode[]);
  };

  const handleDeletePromo = async (promoId: string) => {
    await admin.deletePromo(promoId);
    const updated = await admin.fetchPromos();
    if (updated) setPromos(updated as PromoCode[]);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-sm mx-4 p-6">
          <div className="text-center mb-4">
            <Shield className="h-10 w-10 mx-auto mb-2 text-primary" />
            <h2 className="text-lg font-bold">Админ-панель</h2>
            <p className="text-sm text-muted-foreground mt-1">Введите пароль для доступа</p>
          </div>
          <form onSubmit={async (e) => {
            e.preventDefault();
            await admin.loginWithPassword(passwordInput);
          }} className="space-y-3">
            <Input
              type="password"
              placeholder="Пароль"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              autoFocus
            />
            <Button type="submit" className="w-full" disabled={!passwordInput}>
              Войти
            </Button>
          </form>
          {admin.error && (
            <p className="text-sm text-destructive text-center mt-2">{admin.error}</p>
          )}
          <Button variant="ghost" className="w-full mt-2" onClick={() => navigate('/')}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Назад
          </Button>
        </Card>
      </div>
    );
  }

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredUsers = users.filter(u => 
    u.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.telegram_id.toString().includes(searchTerm)
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="font-bold text-lg">Админ-панель</h1>
          </div>
          <Badge variant="secondary">
            <Shield className="h-3 w-3 mr-1" />
            {user?.roles?.[0]}
          </Badge>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-9 mb-6">
            <TabsTrigger value="dashboard" className="text-xs">
              <LayoutDashboard className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Обзор</span>
            </TabsTrigger>
            <TabsTrigger value="products" className="text-xs">
              <Package className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Товары</span>
            </TabsTrigger>
            <TabsTrigger value="categories" className="text-xs">
              <FolderOpen className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Категории</span>
            </TabsTrigger>
            <TabsTrigger value="promos" className="text-xs">
              <Ticket className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Промо</span>
            </TabsTrigger>
            <TabsTrigger value="orders" className="text-xs">
              <ShoppingCart className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Заказы</span>
            </TabsTrigger>
            <TabsTrigger value="users" className="text-xs">
              <Users className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Юзеры</span>
            </TabsTrigger>
            <TabsTrigger value="reviews" className="text-xs">
              <Star className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Отзывы</span>
            </TabsTrigger>
            <TabsTrigger value="support" className="text-xs relative">
              <MessageCircle className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Тикеты</span>
              {tickets.filter(t => t.status === 'open').length > 0 && (
                <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-destructive-foreground text-[10px] flex items-center justify-center">
                  {tickets.filter(t => t.status === 'open').length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="broadcast" className="text-xs">
              <Send className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Рассылка</span>
            </TabsTrigger>
          </TabsList>

          {/* Loading State */}
          {dataLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          )}

          {!dataLoading && (
            <>
              {/* Dashboard */}
              <TabsContent value="dashboard">
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <Card className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Users className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{stats.users}</p>
                        <p className="text-xs text-muted-foreground">Пользователей</p>
                      </div>
                    </div>
                  </Card>
                  <Card className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <ShoppingCart className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{stats.orders}</p>
                        <p className="text-xs text-muted-foreground">Заказов</p>
                      </div>
                    </div>
                  </Card>
                  <Card className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Package className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{stats.products}</p>
                        <p className="text-xs text-muted-foreground">Товаров</p>
                      </div>
                    </div>
                  </Card>
                  <Card className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <span className="text-primary font-bold">₽</span>
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{stats.revenue.toLocaleString('ru-RU')}</p>
                        <p className="text-xs text-muted-foreground">Выручка</p>
                      </div>
                    </div>
                  </Card>
                </div>

                {/* Charts */}
                <StatsCharts orders={orders} />
              </TabsContent>

              {/* Products */}
              <TabsContent value="products">
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Поиск товаров..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    <Button size="icon" onClick={() => handleOpenProductForm()}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="space-y-2">
                    {filteredProducts.map((product) => (
                      <Card key={product.id} className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className="font-medium truncate">{product.name}</h3>
                              {!product.is_active && (
                                <Badge variant="secondary" className="text-xs">Скрыт</Badge>
                              )}
                              {product.is_popular && (
                                <Badge className="text-xs">Популярное</Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground truncate">{product.short_desc}</p>
                            <p className="text-sm font-bold mt-1">{product.price.toLocaleString('ru-RU')} ₽</p>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenProductItems(product)}
                              title="Загрузить позиции"
                            >
                              <Upload className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleToggleProductActive(product.id, product.is_active)}
                              disabled={admin.isLoading}
                              title={product.is_active ? 'Скрыть' : 'Показать'}
                            >
                              {product.is_active ? <Ban className="h-4 w-4" /> : <Shield className="h-4 w-4" />}
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => handleOpenProductForm(product)}
                              title="Редактировать"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              </TabsContent>

              {/* Categories */}
              <TabsContent value="categories">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h2 className="text-lg font-semibold">Категории ({categories.length})</h2>
                    <Button size="sm" onClick={() => handleOpenCategoryForm()}>
                      <Plus className="h-4 w-4 mr-1" />
                      Добавить
                    </Button>
                  </div>

                  {categories.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <FolderOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Категорий пока нет</p>
                      <Button 
                        variant="outline" 
                        className="mt-4"
                        onClick={() => handleOpenCategoryForm()}
                      >
                        Создать первую категорию
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {categories.map((cat) => (
                        <Card key={cat.id} className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <span className="text-2xl">{cat.icon || '📁'}</span>
                              <div>
                                <h3 className="font-medium">{cat.name}</h3>
                                <p className="text-xs text-muted-foreground">/{cat.slug}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <Badge variant="secondary">
                                {products.filter(p => p.category_id === cat.id).length} товаров
                              </Badge>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleOpenCategoryForm(cat)}
                                title="Редактировать"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteCategory(cat.id)}
                                disabled={admin.isLoading}
                                title="Удалить"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* Promo Codes */}
              <TabsContent value="promos">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h2 className="text-lg font-semibold">Промокоды ({promos.length})</h2>
                    <Button size="sm" onClick={() => setPromoFormOpen(true)}>
                      <Plus className="h-4 w-4 mr-1" />
                      Создать
                    </Button>
                  </div>

                  {promos.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <Ticket className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Промокодов пока нет</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {promos.map((promo) => (
                        <Card key={promo.id} className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-mono font-bold">{promo.code}</p>
                                {!promo.is_active && (
                                  <Badge variant="secondary" className="text-xs">Неактивен</Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground">
                                -{promo.discount_percent}% · Использовано {promo.used_count}/{promo.max_uses}
                              </p>
                              {promo.expires_at && (
                                <p className="text-xs text-muted-foreground">
                                  До: {new Date(promo.expires_at).toLocaleDateString('ru-RU')}
                                </p>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeletePromo(promo.id)}
                              disabled={admin.isLoading || !promo.is_active}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* Orders & Deposits */}
              <TabsContent value="orders">
                <div className="space-y-2">
                  {(() => {
                    // Build unified timeline
                    const timeline: TimelineItem[] = [
                      ...orders.map(o => ({ type: 'order' as const, data: o, created_at: o.created_at })),
                      ...deposits.map(d => ({ type: 'deposit' as const, data: d, created_at: d.created_at })),
                    ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

                    if (timeline.length === 0) {
                      return (
                        <div className="text-center py-12 text-muted-foreground">
                          <ShoppingCart className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p>Заказов и пополнений пока нет</p>
                        </div>
                      );
                    }

                    return timeline.map((item) => {
                      if (item.type === 'deposit') {
                        const d = item.data;
                        return (
                          <Card key={`dep-${d.id}`} className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <Badge variant="outline" className="text-xs bg-green-500/10 text-green-600 border-green-500/30">
                                    💰 Пополнение
                                  </Badge>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  {d.profiles?.username ? `@${d.profiles.username}` : d.profiles?.first_name || '—'}
                                </p>
                                {d.description && (
                                  <p className="text-xs text-muted-foreground mt-1">{d.description}</p>
                                )}
                                <p className="text-[10px] text-muted-foreground mt-1">
                                  {new Date(d.created_at).toLocaleString('ru-RU')}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="font-bold text-green-600">+{parseFloat(String(d.amount)).toLocaleString('ru-RU')} ₽</p>
                                {d.payment_id && (
                                  <p className="text-[10px] text-muted-foreground">{d.payment_id.slice(0, 12)}…</p>
                                )}
                              </div>
                            </div>
                          </Card>
                        );
                      }

                      const order = item.data;
                      return (
                        <OrderCard
                          key={order.id}
                          order={order}
                          onComplete={() => handleUpdateOrderStatus(order.id, 'completed')}
                          onUpdateStatus={(status) => handleUpdateOrderStatus(order.id, status)}
                          isLoading={admin.isLoading}
                        />
                      );
                    });
                  })()}
                </div>
              </TabsContent>

              {/* Users */}
              <TabsContent value="users">
                <div className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Поиск по username или ID..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>

                  <div className="space-y-2">
                    {filteredUsers.map((u) => (
                      <Card key={u.id} className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-medium">
                                {u.username ? `@${u.username}` : u.first_name}
                              </p>
                              {u.is_banned && (
                                <Badge variant="destructive" className="text-xs">Забанен</Badge>
                              )}
                              {u.user_roles?.some(r => r.role === 'admin') && (
                                <Badge className="text-xs">Админ</Badge>
                              )}
                              {u.user_roles?.some(r => r.role === 'moderator') && (
                                <Badge variant="secondary" className="text-xs">Модератор</Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">ID: {u.telegram_id}</p>
                            <p className="text-sm">Баланс: {parseFloat(String(u.balance)).toLocaleString('ru-RU')} ₽</p>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => { setSelectedUser(u); setUserDetailsOpen(true); }}
                              title="Подробнее"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant={u.is_banned ? 'default' : 'destructive'}
                              size="sm"
                              onClick={() => handleToggleUserBan(u.id, u.is_banned)}
                              disabled={admin.isLoading}
                            >
                              {u.is_banned ? 'Разбанить' : 'Забанить'}
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              </TabsContent>

              {/* Reviews */}
              <TabsContent value="reviews">
                <ReviewsTab
                  onFetch={admin.fetchReviews as any}
                  onModerate={admin.moderateReview}
                  isLoading={admin.isLoading}
                />
              </TabsContent>

              {/* Support Tickets */}
              <TabsContent value="support">
                <SupportTicketsTab
                  tickets={tickets}
                  onReply={admin.replyToTicket}
                  onUpdateStatus={admin.updateTicketStatus}
                  isLoading={admin.isLoading}
                  onRefresh={async () => {
                    const data = await admin.fetchTickets();
                    if (data) setTickets(data as any[]);
                  }}
                />
              </TabsContent>

              {/* Broadcast */}
              <TabsContent value="broadcast">
                <BroadcastTab
                  onSend={admin.sendBroadcast}
                  totalUsers={users.filter(u => !u.is_banned).length}
                />
              </TabsContent>
            </>
          )}
        </Tabs>
      </main>

      {/* Dialogs */}
      <ProductFormDialog
        open={productFormOpen}
        onOpenChange={setProductFormOpen}
        product={editingProduct}
        categories={categories}
        onSubmit={handleProductSubmit}
        isLoading={admin.isLoading}
      />

      <ProductItemsDialog
        open={productItemsOpen}
        onOpenChange={setProductItemsOpen}
        product={selectedProductForItems}
        onFetchItems={admin.fetchProductItems}
        onAddItems={admin.addProductItems}
        onAddFileItems={admin.addFileItems}
        onDeleteItem={admin.deleteProductItem}
        isLoading={admin.isLoading}
      />

      <CategoryFormDialog
        open={categoryFormOpen}
        onOpenChange={(open) => {
          setCategoryFormOpen(open);
          if (!open) setEditingCategory(null);
        }}
        category={editingCategory}
        onSubmit={handleCategorySubmit}
        isLoading={admin.isLoading}
      />

      <PromoFormDialog
        open={promoFormOpen}
        onOpenChange={setPromoFormOpen}
        onSubmit={handlePromoSubmit}
        isLoading={admin.isLoading}
      />

      <UserDetailsDialog
        open={userDetailsOpen}
        onOpenChange={setUserDetailsOpen}
        user={selectedUser}
        onToggleBan={handleToggleUserBan}
        onUpdateRole={admin.updateUserRole}
        onUpdateBalance={admin.updateUserBalance}
        onFetchDetails={admin.fetchUserDetails}
        onSendMessage={admin.sendMessageToUser}
        onDeliverProduct={admin.deliverProductToUser}
        products={products}
        isLoading={admin.isLoading}
      />
    </div>
  );
};

export default AdminPage;
