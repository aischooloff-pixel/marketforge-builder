-- ============================================================
-- Abandoned Cart Reminder: cart_sessions table
-- ============================================================

CREATE TABLE IF NOT EXISTS public.cart_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  items JSONB NOT NULL DEFAULT '[]',
  total NUMERIC(10,2) NOT NULL DEFAULT 0,
  reminder_sent BOOLEAN NOT NULL DEFAULT false,
  reminder_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.cart_sessions ENABLE ROW LEVEL SECURITY;
-- Все операции только через service_role (edge functions) — без RLS политик для anon

CREATE INDEX idx_cart_sessions_user_id ON public.cart_sessions(user_id);
CREATE INDEX idx_cart_sessions_updated_at ON public.cart_sessions(updated_at);
CREATE INDEX idx_cart_sessions_reminder_sent ON public.cart_sessions(reminder_sent);

CREATE TRIGGER update_cart_sessions_updated_at
  BEFORE UPDATE ON public.cart_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
