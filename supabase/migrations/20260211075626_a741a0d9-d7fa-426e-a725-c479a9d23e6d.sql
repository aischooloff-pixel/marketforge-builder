-- Update seed: set base price to cheapest period (49₽) and ensure IPv4 version
UPDATE public.products
SET price = 49
WHERE id = 'a1b2c3d4-0001-4000-8000-000000000001';