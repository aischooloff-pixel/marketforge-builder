import { useState } from 'react';
import { useTelegram } from '@/contexts/TelegramContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Star, MessageSquarePlus } from 'lucide-react';
import { toast } from 'sonner';

export const ReviewForm = () => {
  const { user, isAuthenticated } = useTelegram();
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [open, setOpen] = useState(false);

  if (submitted) {
    return (
      <div className="text-center">
        <p className="text-sm text-muted-foreground">✅ Спасибо! Ваш отзыв отправлен на модерацию.</p>
      </div>
    );
  }

  const handleSubmit = async () => {
    if (!user) return;
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
      setOpen(false);
      toast.success('Отзыв отправлен на модерацию');
    } catch {
      toast.error('Не удалось отправить отзыв');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="text-center">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            className="gap-2"
            onClick={(e) => {
              if (!isAuthenticated || !user) {
                e.preventDefault();
                toast.error('Откройте магазин через Telegram для авторизации');
              }
            }}
          >
            <MessageSquarePlus className="h-4 w-4" />
            Оставить отзыв
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Оставить отзыв</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-1">
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
                    className={`h-6 w-6 transition-colors ${
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
              className="resize-none"
              rows={4}
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{text.length}/500</span>
              <Button onClick={handleSubmit} disabled={submitting || !text.trim()}>
                {submitting ? 'Отправка...' : 'Отправить'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
