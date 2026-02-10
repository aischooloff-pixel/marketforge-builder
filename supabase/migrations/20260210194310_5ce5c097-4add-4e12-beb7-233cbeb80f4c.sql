
-- ============================================================
-- FINAL CLEANUP: Drop all remaining USING(true) and duplicate policies
-- ============================================================

-- 1. PROFILES: "Profiles are viewable by owner" has USING(true) — DROP
DROP POLICY IF EXISTS "Profiles are viewable by owner" ON public.profiles;

-- 2. ORDER_ITEMS: "Order items are viewable with order" has USING(true) — DROP
DROP POLICY IF EXISTS "Order items are viewable with order" ON public.order_items;

-- 3. PROMO_USES: "Users can view own promo uses" has USING(true) — DROP
DROP POLICY IF EXISTS "Users can view own promo uses" ON public.promo_uses;

-- 4. PRODUCT_ITEMS: "Anyone can count available items" exposes content — DROP
DROP POLICY IF EXISTS "Anyone can count available items" ON public.product_items;

-- 5. CATEGORIES: duplicate "Categories are viewable by everyone" USING(true) — DROP (keep the is_active one)
DROP POLICY IF EXISTS "Categories are viewable by everyone" ON public.categories;

-- 6. PRODUCTS: duplicate "Products are viewable by everyone" — DROP (keep "Active products are publicly viewable")
DROP POLICY IF EXISTS "Products are viewable by everyone" ON public.products;

-- 7. REVIEWS: duplicate "Reviews viewable by everyone when approved" — DROP (keep "Approved reviews are publicly viewable")
DROP POLICY IF EXISTS "Reviews viewable by everyone when approved" ON public.reviews;

-- 8. PROMO_CODES: "Active promo codes are viewable" exposes codes — DROP
DROP POLICY IF EXISTS "Active promo codes are viewable" ON public.promo_codes;
