
-- =====================================================
-- CRITICAL SECURITY FIX: Tighten RLS policies
-- =====================================================

-- 1. product_items: Remove policy that leaks sold item content to ALL users
--    (sold_to IS NOT NULL = anyone can see ALL sold items' content)
--    Edge functions use service_role key so they bypass RLS
DROP POLICY IF EXISTS "Owners can view purchased items" ON public.product_items;

-- 2. profiles: Remove dangerously permissive UPDATE policy
--    (USING(true) = anyone can change ANY user's balance, ban status, etc.)
--    Balance updates will now only happen through edge functions (service_role)
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- 3. orders: Remove dangerously permissive UPDATE policy
--    (USING(true) = anyone can change ANY order's status)
--    Order updates will now only happen through edge functions (service_role)
DROP POLICY IF EXISTS "Orders can be updated" ON public.orders;

-- 4. support_tickets: Remove dangerously permissive UPDATE policy
--    (USING(true) = anyone can modify ANY support ticket)
--    Ticket updates happen through admin-api edge function (service_role)
DROP POLICY IF EXISTS "Tickets can be updated" ON public.support_tickets;

-- 5. analytics_events: Remove public read access
--    (admin-api uses service_role, no reason for anon to read analytics)
DROP POLICY IF EXISTS "Analytics viewable by admins" ON public.analytics_events;

-- 6. user_roles: Remove public read access
--    (telegram-auth edge function uses service_role for role checks)
DROP POLICY IF EXISTS "Roles are viewable" ON public.user_roles;
