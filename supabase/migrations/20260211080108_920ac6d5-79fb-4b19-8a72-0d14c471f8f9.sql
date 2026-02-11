-- Seed IPv6 proxy product (persists across remixes)
INSERT INTO public.products (
  id, name, short_desc, long_desc, price, type, category_id,
  is_active, is_popular, tags, legal_note, stock, sort_order, max_per_user
)
VALUES (
  'a1b2c3d4-0002-4000-8000-000000000002',
  'IPv6 Прокси',
  'Персональный IPv6 прокси с выбором страны и протокола',
  'Выделенный IPv6 прокси только для вас. Множество стран на выбор, поддержка HTTP/HTTPS и SOCKS5. Самый доступный вариант приватного прокси.',
  9,
  'one-time',
  'd32e03c2-74c5-48d0-8d19-ce3848aea0eb',
  true,
  true,
  ARRAY['api:px6', 'api:px6:v6', 'прокси', 'IPv6', 'приватный', 'приватность'],
  'Для легального тестирования и обеспечения приватности. Запрещены любые противоправные действия.',
  -1,
  3,
  0
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  short_desc = EXCLUDED.short_desc,
  long_desc = EXCLUDED.long_desc,
  tags = EXCLUDED.tags,
  legal_note = EXCLUDED.legal_note;

-- Seed IPv4 Shared proxy product (persists across remixes)
INSERT INTO public.products (
  id, name, short_desc, long_desc, price, type, category_id,
  is_active, is_popular, tags, legal_note, stock, sort_order, max_per_user
)
VALUES (
  'a1b2c3d4-0003-4000-8000-000000000003',
  'IPv4 Shared Прокси',
  'Общий IPv4 прокси с выбором страны и протокола',
  'IPv4 Shared прокси от проверенного поставщика. Подходит для всех сайтов. Выдаётся мгновенно после оплаты. Поддержка HTTP/HTTPS/SOCKS5. Оптимальное соотношение цены и качества.',
  15,
  'one-time',
  'd32e03c2-74c5-48d0-8d19-ce3848aea0eb',
  true,
  true,
  ARRAY['api:px6', 'api:px6:v3', 'прокси', 'IPv4', 'shared', 'приватность'],
  'Для легального тестирования и обеспечения приватности. Запрещены любые противоправные действия.',
  -1,
  4,
  0
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  short_desc = EXCLUDED.short_desc,
  long_desc = EXCLUDED.long_desc,
  tags = EXCLUDED.tags,
  legal_note = EXCLUDED.legal_note;

-- Deactivate old IPv4 Shared product
UPDATE public.products SET is_active = false WHERE id = '3b932510-0dbd-42eb-8f7e-db61793ca15a';