import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Product {
  id: string;
  name: string;
  short_desc: string | null;
  long_desc: string | null;
  price: number;
  type: 'one-time' | 'subscription' | null;
  category_id: string | null;
  is_active: boolean | null;
  is_popular: boolean | null;
  tags: string[] | null;
  legal_note: string | null;
  countries: string[] | null;
  services: string[] | null;
  stock: number | null;
  media_urls: string[] | null;
  sort_order: number | null;
  created_at: string | null;
  categories?: {
    id: string;
    name: string;
    icon: string | null;
    slug: string;
  } | null;
  available_count?: number;
}

interface UseProductsOptions {
  categorySlug?: string;
  search?: string;
  type?: 'one-time' | 'subscription';
  minPrice?: number;
  maxPrice?: number;
  onlyPopular?: boolean;
  limit?: number;
}

export const useProducts = (options: UseProductsOptions = {}) => {
  return useQuery({
    queryKey: ['products', options],
    queryFn: async (): Promise<Product[]> => {
      let query = supabase
        .from('products')
        .select(`
          *,
          categories (
            id,
            name,
            icon,
            slug
          )
        `)
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: false });

      // Filter by category
      if (options.categorySlug && options.categorySlug !== 'all') {
        // First get category id by slug
        const { data: category } = await supabase
          .from('categories')
          .select('id')
          .eq('slug', options.categorySlug)
          .maybeSingle();
        
        if (category) {
          query = query.eq('category_id', category.id);
        }
      }

      // Filter by type
      if (options.type) {
        query = query.eq('type', options.type);
      }

      // Filter by price range
      if (options.minPrice !== undefined) {
        query = query.gte('price', options.minPrice);
      }
      if (options.maxPrice !== undefined) {
        query = query.lte('price', options.maxPrice);
      }

      // Filter popular only
      if (options.onlyPopular) {
        query = query.eq('is_popular', true);
      }

      // Limit results
      if (options.limit) {
        query = query.limit(options.limit);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching products:', error);
        throw error;
      }

      let products = data || [];

      // Client-side search filter (for text search across multiple fields)
      if (options.search) {
        const searchLower = options.search.toLowerCase();
        products = products.filter(p => 
          p.name.toLowerCase().includes(searchLower) ||
          p.short_desc?.toLowerCase().includes(searchLower) ||
          p.tags?.some(tag => tag.toLowerCase().includes(searchLower))
        );
      }

      return products;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

export const useProduct = (id: string | undefined) => {
  return useQuery({
    queryKey: ['product', id],
    queryFn: async (): Promise<Product | null> => {
      if (!id) return null;

      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          categories (
            id,
            name,
            icon,
            slug
          )
        `)
        .eq('id', id)
        .eq('is_active', true)
        .maybeSingle();

      if (error) {
        console.error('Error fetching product:', error);
        throw error;
      }

      return data;
    },
    enabled: !!id,
    staleTime: 1000 * 60 * 5,
  });
};

export const useProductStock = (productId: string | undefined) => {
  const isValidUuid = !!productId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(productId);
  return useQuery({
    queryKey: ['product-stock', productId],
    queryFn: async (): Promise<number> => {
      if (!productId || !isValidUuid) return -1;

      // Stock is now read from the products table (stock column)
      // product_items is locked by RLS; stock is maintained server-side
      const { data, error } = await supabase
        .from('products')
        .select('stock')
        .eq('id', productId)
        .eq('is_active', true)
        .maybeSingle();

      if (error || !data) {
        console.error('Error fetching stock:', error);
        return 0;
      }

      // stock = -1 means unlimited (file-based products)
      return data.stock ?? 0;
    },
    enabled: isValidUuid,
    staleTime: 1000 * 30,
  });
};

export const usePopularProducts = (limit: number = 6) => {
  return useProducts({ onlyPopular: true, limit });
};
