-- Drop old restrictive policy
DROP POLICY IF EXISTS "Items viewable by owner" ON public.product_items;

-- Create policy for counting available items (for stock display)
CREATE POLICY "Anyone can count available items"
ON public.product_items
FOR SELECT
USING (is_sold = false);

-- Create policy for viewing purchased items (for order history)
CREATE POLICY "Owners can view purchased items"
ON public.product_items
FOR SELECT
USING (sold_to IS NOT NULL);