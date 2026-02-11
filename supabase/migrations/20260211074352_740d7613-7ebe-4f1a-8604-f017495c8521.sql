
-- Seed IPv4 proxy product (persists across remixes)
INSERT INTO public.products (
  id, name, short_desc, long_desc, price, type, category_id, 
  is_active, is_popular, tags, legal_note, stock, sort_order, max_per_user
)
VALUES (
  'a1b2c3d4-0001-4000-8000-000000000001',
  'IPv4 Прокси',
  'Персональный IPv4 прокси с выбором страны и протокола',
  'Выделенный IPv4 прокси только для вас. Выбор из множества стран, поддержка HTTP/HTTPS и SOCKS5. Высокая скорость и стабильность. Идеально для тестирования геолокации и обеспечения приватности.',
  90,
  'one-time',
  'd32e03c2-74c5-48d0-8d19-ce3848aea0eb',
  true,
  true,
  ARRAY['api:px6', 'api:px6:v4', 'прокси', 'IPv4', 'приватный', 'приватность'],
  'Для легального тестирования и обеспечения приватности. Запрещены любые противоправные действия.',
  -1,
  1,
  0
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  short_desc = EXCLUDED.short_desc,
  long_desc = EXCLUDED.long_desc,
  tags = EXCLUDED.tags,
  legal_note = EXCLUDED.legal_note;

-- Also ensure IPv4 Shared product has a stable ID for remixes
-- Update existing product to use stable ID if needed
UPDATE public.products 
SET sort_order = 2 
WHERE id = '3b932510-0dbd-42eb-8f7e-db61793ca15a';
