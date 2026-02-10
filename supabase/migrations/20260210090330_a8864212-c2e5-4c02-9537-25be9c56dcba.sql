
CREATE OR REPLACE FUNCTION public.claim_product_item(
  p_product_id uuid,
  p_user_id uuid,
  p_order_id uuid
)
RETURNS SETOF product_items
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE product_items
  SET is_sold = true,
      sold_at = now(),
      sold_to = p_user_id,
      order_id = p_order_id
  WHERE id = (
    SELECT id FROM product_items
    WHERE product_id = p_product_id
      AND is_sold = false
    LIMIT 1
    FOR UPDATE SKIP LOCKED
  )
  RETURNING *;
$$;
