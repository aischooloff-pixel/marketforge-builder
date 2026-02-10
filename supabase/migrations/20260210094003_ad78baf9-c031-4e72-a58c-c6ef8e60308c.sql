
-- Add max_per_user column: 0 = unlimited purchases, 1 = one-time purchase per user, N = max N purchases
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS max_per_user integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.products.max_per_user IS '0 = unlimited purchases per user, 1 = one-time purchase, N = max N per user';
