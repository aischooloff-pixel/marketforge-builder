import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Review {
  id: string;
  user_id: string;
  text: string;
  rating: number;
  status: string;
  created_at: string;
  author_name: string | null;
}

export const useApprovedReviews = () => {
  return useQuery({
    queryKey: ['reviews', 'approved'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reviews')
        .select('id, user_id, text, rating, status, created_at, author_name')
        .eq('status', 'approved')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Review[];
    },
  });
};

export const useAverageRating = (reviews: Review[]) => {
  if (!reviews || reviews.length === 0) return { average: 0, count: 0 };
  const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
  return { average: Math.round((sum / reviews.length) * 10) / 10, count: reviews.length };
};
