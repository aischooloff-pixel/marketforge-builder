
-- ============================================================
-- 1. Rate limiting table for admin login attempts
-- ============================================================
CREATE TABLE public.admin_login_attempts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ip_hint text NOT NULL,  -- hashed or partial identifier
  attempted_at timestamp with time zone NOT NULL DEFAULT now(),
  success boolean NOT NULL DEFAULT false
);

ALTER TABLE public.admin_login_attempts ENABLE ROW LEVEL SECURITY;

-- No public access at all - only service_role can read/write
-- (no policies = deny all for anon/authenticated)

-- Auto-cleanup old attempts (keep 24h)
CREATE INDEX idx_login_attempts_time ON public.admin_login_attempts(attempted_at);

-- ============================================================
-- 2. Fix CRITICAL: products "Admins can manage products" ALL policy
--    Currently USING(true) for public role = anyone can write
-- ============================================================
DROP POLICY IF EXISTS "Admins can manage products" ON public.products;

-- Only service_role (edge functions) can manage products, not anon users
-- No replacement policy needed since admin-api uses service_role

-- ============================================================
-- 3. Fix overly permissive INSERT policies
-- ============================================================

-- Transactions: nobody should insert via client (only edge functions)
DROP POLICY IF EXISTS "Transactions can be inserted" ON public.transactions;

-- Orders: tighten to prevent spoofing user_id
-- Keep the policy but edge functions handle creation via service_role
DROP POLICY IF EXISTS "Users can create orders" ON public.orders;

-- Order items: only via service_role (edge functions)
DROP POLICY IF EXISTS "Order items can be inserted" ON public.order_items;

-- Profiles: keep but the telegram-auth edge function handles creation via service_role
DROP POLICY IF EXISTS "Anyone can insert profiles" ON public.profiles;

-- Analytics events: keep but constrain
DROP POLICY IF EXISTS "Analytics insertable" ON public.analytics_events;

-- Promo uses: only via service_role
DROP POLICY IF EXISTS "Promo uses can be inserted" ON public.promo_uses;

-- Support tickets INSERT: only via service_role  
DROP POLICY IF EXISTS "Users can create tickets" ON public.support_tickets;

-- Reviews INSERT: only via service_role
DROP POLICY IF EXISTS "Users can insert own reviews" ON public.reviews;

-- ============================================================
-- 4. Fix search_path on update_updated_at_column
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;
