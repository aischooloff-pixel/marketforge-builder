
-- Table to track social boost orders from profi-like.ru
CREATE TABLE public.social_boost_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  order_id TEXT, -- profi-like order ID
  service_id INTEGER NOT NULL,
  service_name TEXT NOT NULL,
  category TEXT NOT NULL, -- social network name
  link TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  price NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, processing, in_progress, completed, partial, cancelled, error
  start_count INTEGER,
  remains INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE public.social_boost_orders ENABLE ROW LEVEL SECURITY;

-- Users can only see their own orders
CREATE POLICY "Users can view own social boost orders"
  ON public.social_boost_orders FOR SELECT
  USING (user_id IN (
    SELECT id FROM public.profiles WHERE telegram_id = (
      SELECT telegram_id FROM public.profiles WHERE id = user_id
    )
  ));

-- Service role can do everything (edge functions use service role)
-- No insert/update/delete policies for anon - all mutations via edge functions

-- Trigger for updated_at
CREATE TRIGGER update_social_boost_orders_updated_at
  BEFORE UPDATE ON public.social_boost_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
