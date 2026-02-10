import { useState } from 'react';
import { useTelegram } from '@/contexts/TelegramContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Star } from 'lucide-react';
import { toast } from 'sonner';

export const ReviewForm = () => {
  const { user, isAuthenticated } = useTelegram();
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (!isAuthenticated || !user) return null;
  if (submitted) {
    return (
      <Card className="p-4 md:p-6 text-center">
        <p className="text-sm text-muted-foreground">✅ Спасибо! Ваш отзыв отправлен на модерацию.</p>
      </Card>
    );
  }

  const handleSubmit = async () => {
    if (!text.trim() || text.trim().length < 5) {
      toast.error('Напишите хотя бы 5 символов');
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.from('reviews').insert({
        user_id: user.id,
        text: text.trim().slice(0, 500),
        rating,
      });
      if (error) throw error;
      setSubmitted(true);
      toast.success('Отзыв отправлен на модерацию');
    } catch {
      toast.error('Не удалось отправить отзыв');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="p-4 md:p-6">
      <h3 className="font-semibold text-sm mb-3">Оставить отзыв</h3>
      <div className="flex items-center gap-1 mb-3">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => setRating(star)}
            onMouseEnter={() => setHoverRating(star)}
            onMouseLeave={() => setHoverRating(0)}
            className="p-0.5"
          >
            <Star
              className={`h-5 w-5 transition-colors ${
                star <= (hoverRating || rating)
                  ? 'fill-primary text-primary'
                  : 'text-muted-foreground/30'
              }`}
            />
          </button>
        ))}
      </div>
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Поделитесь впечатлениями..."
        maxLength={500}
        className="mb-3 resize-none"
        rows={3}
      />
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{text.length}/500</span>
        <Button size="sm" onClick={handleSubmit} disabled={submitting || !text.trim()}>
          {submitting ? 'Отправка...' : 'Отправить'}
        </Button>
      </div>
    </Card>
  );
};
