
-- Create Telegram category
INSERT INTO public.categories (name, slug, icon, description, sort_order)
VALUES ('Telegram', 'telegram', '✈️', 'Товары и услуги для Telegram', 10);

-- Create Telegram Stars product (price = base rate per star)
INSERT INTO public.products (name, short_desc, price, type, is_active, is_popular, stock, tags, category_id)
VALUES (
  'Telegram Stars',
  '',
  1.4,
  'one-time',
  true,
  true,
  -1,
  ARRAY['api:stars'],
  (SELECT id FROM public.categories WHERE slug = 'telegram')
);
