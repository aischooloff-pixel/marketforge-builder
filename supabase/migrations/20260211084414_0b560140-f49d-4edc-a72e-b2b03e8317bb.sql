
-- Table to track virtual number activations (Tiger SMS)
CREATE TABLE public.virtual_numbers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  order_id UUID REFERENCES public.orders(id),
  activation_id TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  service TEXT NOT NULL,
  service_name TEXT,
  country TEXT NOT NULL,
  country_name TEXT,
  price NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'waiting',
  sms_code TEXT,
  sms_full TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE public.virtual_numbers ENABLE ROW LEVEL SECURITY;

-- RLS: no direct client access (all via edge functions with service_role)
-- But allow users to read their own numbers
CREATE POLICY "Users can view own virtual numbers"
  ON public.virtual_numbers FOR SELECT
  USING (user_id IN (
    SELECT id FROM profiles WHERE telegram_id = (
      (current_setting('request.jwt.claims', true)::json->>'sub')::bigint
    )
  ));

-- Index for quick lookups
CREATE INDEX idx_virtual_numbers_user_id ON public.virtual_numbers(user_id);
CREATE INDEX idx_virtual_numbers_activation_id ON public.virtual_numbers(activation_id);
CREATE INDEX idx_virtual_numbers_status ON public.virtual_numbers(status);

-- Trigger for updated_at
CREATE TRIGGER update_virtual_numbers_updated_at
  BEFORE UPDATE ON public.virtual_numbers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Seed product: Виртуальные номера (Tiger SMS)
-- Using static UUID for remix persistence
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
);
