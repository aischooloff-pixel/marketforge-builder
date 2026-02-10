import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTelegram } from '@/contexts/TelegramContext';
import { toast } from 'sonner';

interface Stats {
  users: number;
  orders: number;
  revenue: number;
  products: number;
}

interface Product {
  id: string;
  name: string;
  short_desc: string;
  price: number;
  type: string;
  is_active: boolean;
  is_popular: boolean;
  categories?: { name: string; icon: string };
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

type OrderStatus = 'pending' | 'paid' | 'completed' | 'cancelled' | 'refunded';

export const useAdmin = () => {
  const { user, webApp } = useTelegram();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [adminPassword, setAdminPassword] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('admin_password');
    }
    return null;
  });

  const loginWithPassword = useCallback(async (password: string): Promise<boolean> => {
    // Temporarily set password to make a test API call
    setIsLoading(true);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('admin-api', {
        body: {
          adminPassword: password,
          path: '/stats',
          method: 'GET',
        },
      });

      if (fnError || data?.error) {
        toast.error('Неверный пароль');
        setIsLoading(false);
        return false;
      }

      // Password is valid — persist it
      sessionStorage.setItem('admin_password', password);
      setAdminPassword(password);
      setIsLoading(false);
      return true;
    } catch {
      toast.error('Ошибка проверки пароля');
      setIsLoading(false);
      return false;
    }
  }, []);

  const isPasswordAuthed = !!adminPassword;

  const invokeAdminApi = useCallback(async <T>(
    path: string,
    method: string = 'GET',
    body?: Record<string, unknown>
  ): Promise<T | null> => {
    // Need either user id (Telegram) or admin password (browser)
    if (!user?.id && !adminPassword) {
      setError('User not authenticated');
      toast.error('Требуется авторизация');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('admin-api', {
        body: {
          userId: user?.id || null,
          initData: webApp?.initData || undefined,
          adminPassword: adminPassword || undefined,
          path,
          method,
          ...body,
        },
      });

      if (fnError) {
        throw new Error(fnError.message);
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      return data as T;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Ошибка запроса';
      setError(message);
      
      if (message === 'Unauthorized') {
        // Clear bad password
        sessionStorage.removeItem('admin_password');
        setAdminPassword(null);
        toast.error('Неверный пароль или нет прав доступа');
      } else {
        toast.error(message);
      }
      
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, adminPassword]);

  // Stats
  const fetchStats = useCallback(async (): Promise<Stats | null> => {
    return invokeAdminApi<Stats>('/stats', 'GET');
  }, [invokeAdminApi]);

  // Products
  const fetchProducts = useCallback(async (): Promise<Product[] | null> => {
    return invokeAdminApi<Product[]>('/products', 'GET');
  }, [invokeAdminApi]);

  const createProduct = useCallback(async (product: Partial<Product>): Promise<Product | null> => {
    const result = await invokeAdminApi<Product>('/products', 'POST', { product });
    if (result) toast.success('Товар создан');
    return result;
  }, [invokeAdminApi]);

  const updateProduct = useCallback(async (productId: string, product: Partial<Product>): Promise<Product | null> => {
    const result = await invokeAdminApi<Product>(`/products/${productId}`, 'PUT', { product });
    if (result) toast.success('Товар обновлён');
    return result;
  }, [invokeAdminApi]);

  const toggleProductActive = useCallback(async (productId: string, isActive: boolean): Promise<Product | null> => {
    return updateProduct(productId, { is_active: !isActive });
  }, [updateProduct]);

  const deleteProduct = useCallback(async (productId: string): Promise<boolean> => {
    const result = await invokeAdminApi<{ success: boolean }>(`/products/${productId}`, 'DELETE');
    if (result?.success) toast.success('Товар удалён');
    return result?.success || false;
  }, [invokeAdminApi]);

  // Orders
  const fetchOrders = useCallback(async (): Promise<Order[] | null> => {
    return invokeAdminApi<Order[]>('/orders', 'GET');
  }, [invokeAdminApi]);

  const updateOrderStatus = useCallback(async (orderId: string, status: OrderStatus): Promise<Order | null> => {
    const result = await invokeAdminApi<Order>(`/orders/${orderId}`, 'PUT', { status });
    if (result) toast.success('Статус заказа обновлён');
    return result;
  }, [invokeAdminApi]);

  // Users
  const fetchUsers = useCallback(async (): Promise<User[] | null> => {
    return invokeAdminApi<User[]>('/users', 'GET');
  }, [invokeAdminApi]);

  const toggleUserBan = useCallback(async (userId: string, isBanned: boolean, reason?: string): Promise<boolean> => {
    const result = await invokeAdminApi<{ success: boolean }>(
      `/users/${userId}/ban`,
      'POST',
      { banned: !isBanned, reason }
    );
    if (result?.success) {
      toast.success(isBanned ? 'Пользователь разбанен' : 'Пользователь забанен');
    }
    return result?.success || false;
  }, [invokeAdminApi]);

  const updateUserRole = useCallback(async (userId: string, role: 'admin' | 'moderator' | 'user'): Promise<boolean> => {
    const result = await invokeAdminApi<{ success: boolean }>(
      `/users/${userId}/role`,
      'POST',
      { role }
    );
    if (result?.success) toast.success('Роль обновлена');
    return result?.success || false;
  }, [invokeAdminApi]);

  // Product Items
  const fetchProductItems = useCallback(async (productId: string) => {
    return invokeAdminApi(`/product-items/${productId}`, 'GET');
  }, [invokeAdminApi]);

  const addProductItems = useCallback(async (productId: string, items: string[]): Promise<boolean> => {
    const result = await invokeAdminApi<unknown[]>('/product-items', 'POST', {
      productId,
      items,
    });
    if (result) toast.success(`Добавлено ${items.length} позиций`);
    return !!result;
  }, [invokeAdminApi]);

  const addFileItems = useCallback(async (productId: string, fileItems: Array<{ content: string; file_url: string }>): Promise<boolean> => {
    const result = await invokeAdminApi<unknown[]>('/product-items', 'POST', {
      productId,
      fileItems,
    });
    if (result) toast.success(`Добавлено ${fileItems.length} файлов`);
    return !!result;
  }, [invokeAdminApi]);

  const deleteProductItem = useCallback(async (itemId: string): Promise<boolean> => {
    const result = await invokeAdminApi<{ success: boolean }>(`/product-items/${itemId}`, 'DELETE');
    if (result?.success) toast.success('Позиция удалена');
    return result?.success || false;
  }, [invokeAdminApi]);

  // Categories
  const fetchCategories = useCallback(async () => {
    return invokeAdminApi('/categories', 'GET');
  }, [invokeAdminApi]);

  const createCategory = useCallback(async (category: { name: string; slug: string; icon?: string }) => {
    const result = await invokeAdminApi('/categories', 'POST', { category });
    if (result) toast.success('Категория создана');
    return result;
  }, [invokeAdminApi]);

  // Promo Codes
  const fetchPromos = useCallback(async () => {
    return invokeAdminApi('/promos', 'GET');
  }, [invokeAdminApi]);

  const createPromo = useCallback(async (promo: { code: string; discount_percent: number; max_uses: number; expires_at?: string }) => {
    const result = await invokeAdminApi('/promos', 'POST', { promo });
    if (result) toast.success('Промокод создан');
    return result;
  }, [invokeAdminApi]);

  const deletePromo = useCallback(async (promoId: string) => {
    const result = await invokeAdminApi<{ success: boolean }>(`/promos/${promoId}`, 'DELETE');
    if (result?.success) toast.success('Промокод деактивирован');
    return result?.success || false;
  }, [invokeAdminApi]);

  const validatePromo = useCallback(async (code: string, userId?: string) => {
    return invokeAdminApi<{ valid: boolean; discount_percent?: number; promo_id?: string; error?: string }>('/promos/validate', 'POST', { code, userId });
  }, [invokeAdminApi]);

  // Support Tickets
  const fetchTickets = useCallback(async () => {
    return invokeAdminApi('/support-tickets', 'GET');
  }, [invokeAdminApi]);

  const createTicket = useCallback(async (ticketUserId: string, subject: string, message: string) => {
    const result = await invokeAdminApi('/support-tickets', 'POST', { ticketUserId, subject, message });
    if (result) toast.success('Обращение отправлено');
    return result;
  }, [invokeAdminApi]);

  const replyToTicket = useCallback(async (ticketId: string, reply: string, adminId?: string) => {
    const result = await invokeAdminApi<{ success: boolean }>(`/support-tickets/${ticketId}/reply`, 'POST', { reply, adminId });
    if (result?.success) toast.success('Ответ отправлен');
    return result?.success || false;
  }, [invokeAdminApi]);

  const updateTicketStatus = useCallback(async (ticketId: string, status: string) => {
    return invokeAdminApi(`/support-tickets/${ticketId}`, 'PUT', { status });
  }, [invokeAdminApi]);

  // User balance management
  const updateUserBalance = useCallback(async (userId: string, amount: number, action: 'add' | 'set') => {
    const result = await invokeAdminApi<{ success: boolean; balance: number }>(`/users/${userId}/balance`, 'POST', { amount, action });
    if (result?.success) toast.success('Баланс обновлён');
    return result;
  }, [invokeAdminApi]);

  // User details
  const fetchUserDetails = useCallback(async (userId: string) => {
    return invokeAdminApi(`/users/${userId}/details`, 'GET');
  }, [invokeAdminApi]);

  // Send message to user via Telegram bot
  const sendMessageToUser = useCallback(async (userId: string, text: string) => {
    const result = await invokeAdminApi<{ success: boolean }>(`/users/${userId}/message`, 'POST', { text });
    if (result?.success) toast.success('Сообщение отправлено');
    return result?.success || false;
  }, [invokeAdminApi]);

  // Deliver product to user
  const deliverProductToUser = useCallback(async (userId: string, productId: string, quantity: number = 1) => {
    const result = await invokeAdminApi<{ success: boolean; orderId: string; claimedCount: number }>(
      `/users/${userId}/deliver`, 'POST', { productId, quantity }
    );
    if (result?.success) toast.success(`Товар выдан (${result.claimedCount} шт.)`);
    return result;
  }, [invokeAdminApi]);

  // Broadcast
  const sendBroadcast = useCallback(async (data: {
    text: string;
    media_url?: string;
    media_type?: string;
    parse_mode: string;
    buttons?: Array<{ text: string; url: string }>;
  }) => {
    return invokeAdminApi<{ success: boolean; sent: number; failed: number; total: number }>('/broadcast', 'POST', data);
  }, [invokeAdminApi]);

  // Reviews
  const fetchReviews = useCallback(async () => {
    return invokeAdminApi('/reviews', 'GET');
  }, [invokeAdminApi]);

  const moderateReview = useCallback(async (reviewId: string, status: 'approved' | 'rejected') => {
    const result = await invokeAdminApi<{ success: boolean }>(`/reviews/${reviewId}/moderate`, 'POST', { status });
    if (result?.success) toast.success(status === 'approved' ? 'Отзыв одобрен' : 'Отзыв отклонён');
    return result?.success || false;
  }, [invokeAdminApi]);

  return {
    isLoading,
    error,
    // Auth
    loginWithPassword,
    isPasswordAuthed,
    // Stats
    fetchStats,
    // Products
    fetchProducts,
    createProduct,
    updateProduct,
    toggleProductActive,
    deleteProduct,
    // Orders
    fetchOrders,
    updateOrderStatus,
    // Users
    fetchUsers,
    toggleUserBan,
    updateUserRole,
    updateUserBalance,
    fetchUserDetails,
    sendMessageToUser,
    deliverProductToUser,
    // Product Items
    fetchProductItems,
    addProductItems,
    addFileItems,
    deleteProductItem,
    // Categories
    fetchCategories,
    createCategory,
    // Promo Codes
    fetchPromos,
    createPromo,
    deletePromo,
    validatePromo,
    // Support
    fetchTickets,
    createTicket,
    replyToTicket,
    updateTicketStatus,
    // Reviews
    fetchReviews,
    moderateReview,
    // Broadcast
    sendBroadcast,
  };
};
