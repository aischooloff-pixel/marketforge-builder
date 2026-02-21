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
      
      // Fetch usernames for reviews
      const userIds = [...new Set((data || []).map(r => r.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, first_name')
        .in('id', userIds);
      
      const profileMap = new Map((profiles || []).map(p => [p.id, p]));
      
      return (data || []).map(r => {
        const profile = profileMap.get(r.user_id);
        const displayName = r.author_name 
          || (profile?.username ? `@${profile.username}` : null)
          || profile?.first_name
          || null;
        return { ...r, author_name: displayName };
      }) as Review[];
    },
  });
};

export const useAverageRating = (reviews: Review[]) => {
  if (!reviews || reviews.length === 0) return { average: 0, count: 0 };
  const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
  return { average: Math.round((sum / reviews.length) * 10) / 10, count: reviews.length };
};
