# Abandoned Cart Reminder — Реанимация корзины

## Как работает

1. Пользователь добавляет товары → корзина синхронизируется в `cart_sessions` (debounce 1.5 сек)
2. Каждые 5 минут cron вызывает `cart-reminder`
3. Если корзина не обновлялась **15 минут** и напоминание ещё не отправлено → бот шлёт сообщение
4. **Разовая отправка** — повторных напоминаний нет
5. После оплаты `cart_sessions` удаляется автоматически

## Компоненты

| Компонент | Описание |
|-----------|----------|
| `cart_sessions` (таблица) | Хранит состояние корзины |
| `sync-cart` (edge function) | Синхронизация корзины с сервером |
| `cart-reminder` (edge function) | Поиск брошенных корзин + отправка в Telegram |
| `CartContext.tsx` | Фронтенд — автосинхронизация |
| cron `cart-reminder-job` | Каждые 5 мин вызывает cart-reminder |

## Настройка задержки

В `supabase/functions/cart-reminder/index.ts`:
```ts
const REMINDER_DELAY_MINUTES = 15;
```
