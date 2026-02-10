
-- ============================================================
-- COMPREHENSIVE SECURITY HARDENING: RLS SELECT policies
-- ============================================================

-- 1. PROFILES: Users can only see their own profile
-- (Edge functions use service_role, products page uses edge functions)
DROP POLICY IF EXISTS "Anyone can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Anyone can read profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view profiles" ON public.profiles;

-- For Telegram app: users read own profile via edge function (service_role)
-- Public catalog needs product data, not user profiles
-- Keep profiles locked down - only service_role access

-- 2. ORDERS: Users can only view their own orders
DROP POLICY IF EXISTS "Users can view own orders" ON public.orders;
DROP POLICY IF EXISTS "Users can view orders" ON public.orders;
DROP POLICY IF EXISTS "Anyone can view orders" ON public.orders;
DROP POLICY IF EXISTS "Orders are viewable" ON public.orders;

-- 3. ORDER_ITEMS: Users can only view items from their own orders  
DROP POLICY IF EXISTS "Users can view order items" ON public.order_items;
DROP POLICY IF EXISTS "Anyone can view order items" ON public.order_items;
DROP POLICY IF EXISTS "Order items are viewable" ON public.order_items;

-- 4. TRANSACTIONS: Users can only view their own transactions
DROP POLICY IF EXISTS "Users can view own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can view transactions" ON public.transactions;
DROP POLICY IF EXISTS "Anyone can view transactions" ON public.transactions;
DROP POLICY IF EXISTS "Transactions are viewable" ON public.transactions;

-- 5. SUPPORT_TICKETS: Users can only view their own tickets
DROP POLICY IF EXISTS "Users can view own tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Users can view tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Anyone can view tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Support tickets are viewable" ON public.support_tickets;

-- 6. PROMO_USES: Users can only view their own promo usage
DROP POLICY IF EXISTS "Users can view promo uses" ON public.promo_uses;
DROP POLICY IF EXISTS "Anyone can view promo uses" ON public.promo_uses;
DROP POLICY IF EXISTS "Promo uses are viewable" ON public.promo_uses;

-- 7. ADMIN_LOGIN_ATTEMPTS: No public access at all (already done but ensure)
DROP POLICY IF EXISTS "Anyone can view login attempts" ON public.admin_login_attempts;

-- 8. ANALYTICS_EVENTS: No public read
DROP POLICY IF EXISTS "Anyone can view analytics" ON public.analytics_events;
DROP POLICY IF EXISTS "Analytics are viewable" ON public.analytics_events;

-- 9. USER_ROLES: No public read (prevents role enumeration)
DROP POLICY IF EXISTS "Anyone can view user roles" ON public.user_roles;
DROP POLICY IF EXISTS "User roles are viewable" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view roles" ON public.user_roles;

-- 10. PRODUCT_ITEMS: No public read (contains sold content!)
DROP POLICY IF EXISTS "Anyone can view product items" ON public.product_items;
DROP POLICY IF EXISTS "Product items are viewable" ON public.product_items;

-- 11. PROMO_CODES: No public read (prevents code enumeration)
DROP POLICY IF EXISTS "Anyone can view promo codes" ON public.promo_codes;
DROP POLICY IF EXISTS "Promo codes are viewable" ON public.promo_codes;

-- 12. REVIEWS: Public read is OK for approved reviews only
DROP POLICY IF EXISTS "Anyone can view reviews" ON public.reviews;
DROP POLICY IF EXISTS "Reviews are viewable" ON public.reviews;
DROP POLICY IF EXISTS "Approved reviews are viewable" ON public.reviews;

CREATE POLICY "Approved reviews are publicly viewable"
ON public.reviews FOR SELECT
USING (status = 'approved');

-- 13. PRODUCTS: Public read for active products only (catalog)
DROP POLICY IF EXISTS "Anyone can view products" ON public.products;
DROP POLICY IF EXISTS "Products are viewable" ON public.products;
DROP POLICY IF EXISTS "Anyone can view active products" ON public.products;

CREATE POLICY "Active products are publicly viewable"
ON public.products FOR SELECT
USING (is_active = true);

-- 14. CATEGORIES: Public read is OK (catalog navigation)
DROP POLICY IF EXISTS "Anyone can view categories" ON public.categories;
DROP POLICY IF EXISTS "Categories are viewable" ON public.categories;

CREATE POLICY "Active categories are publicly viewable"
ON public.categories FOR SELECT
USING (is_active = true);
