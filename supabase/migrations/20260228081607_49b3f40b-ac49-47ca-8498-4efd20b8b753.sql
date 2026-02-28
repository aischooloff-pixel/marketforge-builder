
ALTER TABLE public.categories ADD COLUMN cashback_percent numeric NOT NULL DEFAULT 0;

-- Set 10% cashback for Скрипты and Бизнесы
UPDATE public.categories SET cashback_percent = 10 WHERE slug IN ('scripts', 'biz');
