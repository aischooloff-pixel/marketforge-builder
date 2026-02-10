
CREATE TABLE public.reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  text TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  moderated_at TIMESTAMP WITH TIME ZONE,
  moderated_by UUID REFERENCES public.profiles(id)
);

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reviews viewable by everyone when approved" ON public.reviews
  FOR SELECT USING (status = 'approved');

CREATE POLICY "Users can view own reviews" ON public.reviews
  FOR SELECT USING (user_id = (SELECT id FROM profiles WHERE telegram_id = (current_setting('request.jwt.claims', true)::json->>'sub')::bigint));

CREATE POLICY "Users can insert own reviews" ON public.reviews
  FOR INSERT WITH CHECK (true);

CREATE INDEX idx_reviews_status ON public.reviews(status);
CREATE INDEX idx_reviews_user_id ON public.reviews(user_id);
