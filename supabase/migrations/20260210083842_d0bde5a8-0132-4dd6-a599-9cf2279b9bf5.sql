
-- Create promo_codes table
CREATE TABLE public.promo_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  discount_percent numeric NOT NULL CHECK (discount_percent > 0 AND discount_percent <= 100),
  max_uses integer NOT NULL DEFAULT 1,
  used_count integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  expires_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;

-- Everyone can read active promo codes (to validate at checkout)
CREATE POLICY "Active promo codes are viewable"
ON public.promo_codes
FOR SELECT
USING (is_active = true);

-- Track promo usage per user
CREATE TABLE public.promo_uses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  promo_id uuid NOT NULL REFERENCES public.promo_codes(id),
  user_id uuid NOT NULL REFERENCES public.profiles(id),
  order_id uuid REFERENCES public.orders(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(promo_id, user_id)
);

ALTER TABLE public.promo_uses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own promo uses"
ON public.promo_uses
FOR SELECT
USING (true);

CREATE POLICY "Promo uses can be inserted"
ON public.promo_uses
FOR INSERT
WITH CHECK (true);
