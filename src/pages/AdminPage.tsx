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
  Eye
} from 'lucide-react';

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
  profiles?: { username: string; first_name: string; telegram_id: number };
  order_items?: Array<{ product_name: string; price: number; quantity: number }>;
}

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

const AdminPage = () => {
  const { user, isAdmin, isLoading: authLoading } = useTelegram();
  const navigate = useNavigate();
  const admin = useAdmin();
  
  // ВРЕМЕННО: открытый доступ к админке
  const TEMP_OPEN_ACCESS = true;
  
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState<Stats>({ users: 0, orders: 0, revenue: 0, products: 0 });
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [promos, setPromos] = useState<PromoCode[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [dataLoading, setDataLoading] = useState(true);
  const [tickets, setTickets] = useState<any[]>([]);
  const [userDetailsOpen, setUserDetailsOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Dialogs state
  const [productFormOpen, setProductFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productItemsOpen, setProductItemsOpen] = useState(false);
  const [selectedProductForItems, setSelectedProductForItems] = useState<Product | null>(null);
  const [categoryFormOpen, setCategoryFormOpen] = useState(false);
  const [promoFormOpen, setPromoFormOpen] = useState(false);
  // Redirect if not admin (disabled temporarily)
  useEffect(() => {
    if (!TEMP_OPEN_ACCESS && !authLoading && !isAdmin) {
      navigate('/');
    }
  }, [isAdmin, authLoading, navigate]);

  // Load data via admin-api
  useEffect(() => {
    if (TEMP_OPEN_ACCESS || isAdmin) {
      loadAllData();
    }
  }, [isAdmin]);

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
    if (ordersData) setOrders(ordersData);
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
    if (updated) setOrders(updated);
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
    await admin.createCategory(categoryData as { name: string; slug: string; icon?: string });
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

  if (authLoading && !TEMP_OPEN_ACCESS) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!TEMP_OPEN_ACCESS && !isAdmin) {
    return null;
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
          <TabsList className="grid w-full grid-cols-7 mb-6">
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
            <TabsTrigger value="support" className="text-xs relative">
              <MessageCircle className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Тикеты</span>
              {tickets.filter(t => t.status === 'open').length > 0 && (
                <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-destructive-foreground text-[10px] flex items-center justify-center">
                  {tickets.filter(t => t.status === 'open').length}
                </span>
              )}
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
                    <Button size="sm" onClick={() => setCategoryFormOpen(true)}>
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
                        onClick={() => setCategoryFormOpen(true)}
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
                            <Badge variant="secondary">
                              {products.filter(p => p.category_id === cat.id).length} товаров
                            </Badge>
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

              {/* Orders */}
              <TabsContent value="orders">
                <div className="space-y-2">
                  {orders.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <ShoppingCart className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Заказов пока нет</p>
                    </div>
                  ) : (
                    orders.map((order) => (
                      <Card key={order.id} className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <p className="font-medium">#{order.id.slice(0, 8)}</p>
                            <p className="text-xs text-muted-foreground">
                              {order.profiles?.username || order.profiles?.first_name}
                            </p>
                          </div>
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
                        </div>
                        {order.order_items && order.order_items.length > 0 && (
                          <div className="text-xs text-muted-foreground mb-2">
                            {order.order_items.map(item => item.product_name).join(', ')}
                          </div>
                        )}
                        {order.status === 'paid' && (
                          <Button
                            size="sm"
                            className="w-full mt-2"
                            onClick={() => handleUpdateOrderStatus(order.id, 'completed')}
                            disabled={admin.isLoading}
                          >
                            Выполнить заказ
                          </Button>
                        )}
                      </Card>
                    ))
                  )}
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
        onOpenChange={setCategoryFormOpen}
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
