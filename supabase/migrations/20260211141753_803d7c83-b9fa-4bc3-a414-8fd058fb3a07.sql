
-- Re-seed Virtual Numbers product with ON CONFLICT for remix persistence
INSERT INTO public.products (id, name, short_desc, long_desc, price, type, category_id, tags, is_active, is_popular, stock, legal_note, sort_order, max_per_user)
VALUES (
  'a1b2c3d4-5678-9abc-def0-111111111111'::uuid,
  'Виртуальные номера (SMS)',
  'Номера для приёма SMS от 100+ сервисов',
  'Виртуальные номера для приёма SMS-кодов. Поддержка 180+ стран и 500+ сервисов: Telegram, WhatsApp, Google, Instagram, TikTok и др. Мгновенная выдача номера, приём СМС в личном кабинете.',
  0,
  'one-time',
  (SELECT id FROM categories WHERE slug = 'social' LIMIT 1),
  ARRAY['api:tiger', 'номера', 'SMS', 'верификация'],
  true,
  true,
  -1,
  'Только для тестирования и легальной верификации. Запрещено использование для мошенничества и создания фейковых аккаунтов.',
  5,
  0
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  short_desc = EXCLUDED.short_desc,
  long_desc = EXCLUDED.long_desc,
  tags = EXCLUDED.tags,
  legal_note = EXCLUDED.legal_note,
  is_active = EXCLUDED.is_active;
