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
  const { user } = useTelegram();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ВРЕМЕННО: открытый доступ
  const TEMP_OPEN_ACCESS = true;

  const invokeAdminApi = useCallback(async <T>(
    path: string,
    method: string = 'GET',
    body?: Record<string, unknown>
  ): Promise<T | null> => {
    // При открытом доступе не требуем user.id
    if (!TEMP_OPEN_ACCESS && !user?.id) {
      setError('User not authenticated');
      toast.error('Требуется авторизация');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('admin-api', {
        body: {
          userId: user?.id || 'temp-admin',
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
        toast.error('Нет прав доступа');
      } else {
        toast.error(message);
      }
      
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

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

  // Categories
  const fetchCategories = useCallback(async () => {
    return invokeAdminApi('/categories', 'GET');
  }, [invokeAdminApi]);

  const createCategory = useCallback(async (category: { name: string; slug: string; icon?: string }) => {
    const result = await invokeAdminApi('/categories', 'POST', { category });
    if (result) toast.success('Категория создана');
    return result;
  }, [invokeAdminApi]);

  return {
    isLoading,
    error,
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
    // Product Items
    fetchProductItems,
    addProductItems,
    // Categories
    fetchCategories,
    createCategory,
  };
};
