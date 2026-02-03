import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  description: string | null;
  is_active: boolean | null;
  sort_order: number | null;
  created_at: string | null;
}

export const useCategories = () => {
  return useQuery({
    queryKey: ['categories'],
    queryFn: async (): Promise<Category[]> => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error) {
        console.error('Error fetching categories:', error);
        throw error;
      }

      return data || [];
    },
    staleTime: 1000 * 60 * 10, // 10 minutes - categories rarely change
  });
};

export const useCategory = (slug: string | undefined) => {
  return useQuery({
    queryKey: ['category', slug],
    queryFn: async (): Promise<Category | null> => {
      if (!slug) return null;

      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('slug', slug)
        .eq('is_active', true)
        .maybeSingle();

      if (error) {
        console.error('Error fetching category:', error);
        throw error;
      }

      return data;
    },
    enabled: !!slug,
    staleTime: 1000 * 60 * 10,
  });
};
