
CREATE TABLE public.pending_reviews (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  telegram_id bigint NOT NULL,
  rating integer NOT NULL,
  order_id text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Auto-cleanup old pending reviews (older than 1 hour)
CREATE INDEX idx_pending_reviews_telegram_id ON public.pending_reviews (telegram_id);
CREATE INDEX idx_pending_reviews_created_at ON public.pending_reviews (created_at);

ALTER TABLE public.pending_reviews ENABLE ROW LEVEL SECURITY;
