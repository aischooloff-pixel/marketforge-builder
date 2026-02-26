# Abandoned Cart Reminder — Инструкция по установке

## Что изменилось в проекте

### Новые файлы:
- `supabase/migrations/20260226200000_cart_sessions.sql` — новая таблица
- `supabase/functions/sync-cart/index.ts` — синхронизация корзины
- `supabase/functions/cart-reminder/index.ts` — рассылка напоминаний
- `src/contexts/CartContext.tsx` — обновлён (добавлена синхронизация)

### Изменённые файлы:
- `supabase/functions/pay-with-balance/index.ts` — удаление корзины после оплаты
- `supabase/functions/cryptobot-webhook/index.ts` — удаление корзины после оплаты
- `supabase/functions/xrocket-webhook/index.ts` — удаление корзины после оплаты

---

## Установка (3 шага)

### Шаг 1 — SQL миграция

В Supabase Dashboard → **SQL Editor** выполни содержимое файла:
`supabase/migrations/20260226200000_cart_sessions.sql`

### Шаг 2 — Задеплой функции

```bash
supabase functions deploy sync-cart
supabase functions deploy cart-reminder
```

Или вручную через Dashboard → Edge Functions.

### Шаг 3 — Cron Job

В Supabase Dashboard → **Database → Cron Jobs** → **+ New cron job**:

| Поле | Значение |
|------|----------|
| Name | `cart-reminder-job` |
| Schedule | `*/15 * * * *` |
| Command | см. ниже |

```sql
SELECT net.http_post(
  url := 'https://dhazezwjaqlqmnacgnim.supabase.co/functions/v1/cart-reminder',
  headers := '{"Content-Type": "application/json", "Authorization": "Bearer ВАШ_SERVICE_ROLE_KEY"}'::jsonb,
  body := '{}'::jsonb
);
```

> Service Role Key: Supabase Dashboard → Settings → API → `service_role`

---

## Настройка времени напоминания

В `supabase/functions/cart-reminder/index.ts`:

```ts
const REMINDER_DELAY_MINUTES = 60; // меняй на нужное значение
```

---

## Как работает

```
Пользователь добавил товар
        ↓ (1.5 сек debounce)
sync-cart → сохранить в cart_sessions
        ↓ (каждые 15 мин)
cart-reminder → найти корзины старше 1 часа
        ↓
Telegram бот → отправить напоминание
        ↓
Пользователь оплатил → cart_sessions удалена
```
