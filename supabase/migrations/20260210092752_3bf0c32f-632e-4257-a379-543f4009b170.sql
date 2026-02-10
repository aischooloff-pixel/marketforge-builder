
-- Update claim_product_item to handle file-based items as reusable
-- If item has file_url, just return it without marking as sold
CREATE OR REPLACE FUNCTION public.claim_product_item(p_product_id uuid, p_user_id uuid, p_order_id uuid)
 RETURNS SETOF product_items
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_item product_items;
BEGIN
  -- First try to find a reusable file-based item
  SELECT * INTO v_item
  FROM product_items
  WHERE product_id = p_product_id
    AND file_url IS NOT NULL
  LIMIT 1;

  IF FOUND THEN
    -- File-based item: return without marking as sold (reusable)
    RETURN NEXT v_item;
    RETURN;
  END IF;

  -- Otherwise claim a regular text item (one-time use)
  RETURN QUERY
  UPDATE product_items
  SET is_sold = true,
      sold_at = now(),
      sold_to = p_user_id,
      order_id = p_order_id
  WHERE id = (
    SELECT id FROM product_items
    WHERE product_id = p_product_id
      AND is_sold = false
      AND file_url IS NULL
    LIMIT 1
    FOR UPDATE SKIP LOCKED
  )
  RETURNING *;
END;
$function$;
