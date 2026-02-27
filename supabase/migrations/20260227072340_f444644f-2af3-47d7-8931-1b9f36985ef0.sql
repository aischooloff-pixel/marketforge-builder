
CREATE TABLE public.cart_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  total numeric NOT NULL DEFAULT 0,
  reminder_sent boolean NOT NULL DEFAULT false,
  reminder_sent_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_cart_sessions_user_id ON public.cart_sessions(user_id);
CREATE INDEX idx_cart_sessions_reminder ON public.cart_sessions(reminder_sent, updated_at);

ALTER TABLE public.cart_sessions ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_cart_sessions_updated_at
  BEFORE UPDATE ON public.cart_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
