import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Star, Check, X, Loader2 } from 'lucide-react';

interface Review {
  id: string;
  text: string;
  rating: number;
  status: string;
  created_at: string;
  profiles?: { first_name: string; username: string };
}

interface ReviewsTabProps {
  onFetch: () => Promise<Review[] | null>;
  onModerate: (reviewId: string, status: 'approved' | 'rejected') => Promise<boolean>;
  isLoading: boolean;
}

export const ReviewsTab = ({ onFetch, onModerate, isLoading }: ReviewsTabProps) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');

  useEffect(() => {
    loadReviews();
  }, []);

  const loadReviews = async () => {
    setLoading(true);
    const data = await onFetch();
    if (data) setReviews(data);
    setLoading(false);
  };

  const handleModerate = async (id: string, status: 'approved' | 'rejected') => {
    const ok = await onModerate(id, status);
    if (ok) {
      setReviews(prev => prev.map(r => r.id === id ? { ...r, status } : r));
    }
  };

  const filtered = reviews.filter(r => filter === 'all' || r.status === filter);
  const pendingCount = reviews.filter(r => r.status === 'pending').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <h2 className="text-lg font-semibold mr-2">Отзывы ({reviews.length})</h2>
        {(['pending', 'approved', 'rejected', 'all'] as const).map(f => (
          <Button
            key={f}
            size="sm"
            variant={filter === f ? 'default' : 'outline'}
            onClick={() => setFilter(f)}
            className="text-xs relative"
          >
            {f === 'pending' && 'На модерации'}
            {f === 'approved' && 'Одобрены'}
            {f === 'rejected' && 'Отклонены'}
            {f === 'all' && 'Все'}
            {f === 'pending' && pendingCount > 0 && (
              <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-destructive-foreground text-[10px] flex items-center justify-center">
                {pendingCount}
              </span>
            )}
          </Button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Star className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Нет отзывов</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((review) => (
            <Card key={review.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium text-sm">
                      {review.profiles?.username ? `@${review.profiles.username}` : review.profiles?.first_name || 'Аноним'}
                    </p>
                    <Badge
                      variant={review.status === 'approved' ? 'default' : review.status === 'pending' ? 'secondary' : 'destructive'}
                      className="text-xs"
                    >
                      {review.status === 'pending' ? 'Модерация' : review.status === 'approved' ? 'Одобрен' : 'Отклонён'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-0.5 mb-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={`h-3 w-3 ${i < review.rating ? 'fill-primary text-primary' : 'text-muted-foreground/30'}`} />
                    ))}
                  </div>
                  <p className="text-sm">{review.text}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(review.created_at).toLocaleDateString('ru-RU')}
                  </p>
                </div>
                {review.status === 'pending' && (
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-green-600"
                      onClick={() => handleModerate(review.id, 'approved')}
                      disabled={isLoading}
                      title="Одобрить"
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-destructive"
                      onClick={() => handleModerate(review.id, 'rejected')}
                      disabled={isLoading}
                      title="Отклонить"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
