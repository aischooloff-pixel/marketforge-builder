
-- Seed promo code TEMKA
INSERT INTO public.promo_codes (id, code, discount_percent, max_uses, used_count, is_active, expires_at)
VALUES (
  '127be508-0626-4d98-b5d0-8b1a1f00d533',
  'TEMKA',
  10,
  20,
  0,
  true,
  NULL
)
ON CONFLICT (id) DO NOTHING;

-- Seed approved reviews
INSERT INTO public.reviews (id, user_id, rating, text, status, created_at, moderated_at)
VALUES
  (
    'cd0ee2b1-b711-4ea5-a101-7aff73ffde9d',
    '76d8b902-f951-40b9-b1d6-6a3d83e3da82',
    5,
    'все отлично, впн выдали автоматически и аккаунт даже не с минимальным сроком подписки какой заявлен. аккаунт выдали также сразу. заебись шоп',
    'approved',
    '2026-02-20 21:02:41.533912+00',
    '2026-02-20 21:03:29.938+00'
  ),
  (
    '2b34a53d-5d77-4b94-a0f0-29faba8a1007',
    '1a411173-d8df-49c7-8734-a8fb12b63cf2',
    5,
    'охуенный шоп все выдают моментом',
    'approved',
    '2026-02-23 09:07:20.855541+00',
    '2026-02-24 09:54:30.867+00'
  )
ON CONFLICT (id) DO NOTHING;
