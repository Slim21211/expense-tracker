# Трекер расходов

Приложение для учета расходов и планирования бюджета с PWA поддержкой.

## Стек технологий

- **Frontend**: React, TypeScript, CSS Modules
- **State Management**: Redux Toolkit, RTK Query
- **Backend**: Supabase (PostgreSQL, Auth, Realtime)
- **Deployment**: GitHub Pages (`.github/workflows/deploy.yml`, при пуше в `main`)
- **PWA**: vite-plugin-pwa

## Установка и запуск

```bash
# Установка зависимостей
npm install

# Запуск в режиме разработки
npm run dev

# Сборка для продакшена
npm run build

# Предпросмотр продакшен сборки
npm preview
```

## Модель данных

Все деньги — только в таблице `transactions`. Балансы и итоги нигде не хранятся,
они вычисляются представлениями `account_balances` и `budget_month_totals`.

| Таблица | Что хранит |
|---|---|
| `accounts` | Счета: `regular` (карты, участвуют в бюджете), `savings` (копилки), `credit` (кредиты, баланс ≤ 0) |
| `transactions` | `income` (извне → счёт), `expense` (счёт → наружу), `transfer` (счёт → счёт), `adjustment` (корректировка) |
| `budget_months`, `income_items`, `expense_items` | Только **планы**. Факт — транзакции с `income_item_id` |

Бюджет месяца — это деньги на `regular`-счетах: перевод в копилку уменьшает остаток месяца,
перевод между картами — нет. Остаток переносится в следующий месяц автоматически.

## Деплой

Сборку и публикацию при каждом пуше в `main` делает GitHub Actions.

1. Settings → Pages → Source: **GitHub Actions**.
2. Без своего домена сайт открывается по адресу `https://<user>.github.io/<репозиторий>/`.
3. Свой домен: Settings → Pages → Custom domain и перезапуск деплоя — путь приложения
   (корень или подпапка) workflow определяет сам.
4. В Supabase (Authentication → URL Configuration) — адрес сайта в Site URL и
   `<адрес>/reset-password` в Redirect URLs.

## Миграции

Выполнять в Supabase SQL Editor по порядку:

1. `supabase/migrations/001_ledger_schema.sql` — новые таблицы (старые не трогаются)
2. `supabase/migrations/002_ledger_data.sql` — перенос истории + таблица сверки.
   Можно запускать повторно: перенесённое пересоздаётся, внесённое в новом интерфейсе сохраняется.
3. `supabase/migrations/003_untracked_accounts.sql` — счета вне учёта
4. `supabase/migrations/004_savings_debt.sql` — долг перед копилкой (назначение перевода: в долг / возврат)

Откат до перехода: `supabase/migrations/rollback_ledger.sql`.
Старые схемы и снимок прода — в `supabase/legacy/`.

## Структура проекта

```
src/
├── components/       # Переиспользуемые компоненты
├── features/         # Фичи приложения
├── pages/           # Страницы
├── services/        # API и Supabase клиент
├── store/           # Redux store
├── types/           # TypeScript типы
├── utils/           # Утилиты
└── styles/          # Глобальные стили
```

## Основной функционал

- ✅ Аутентификация пользователей
- ✅ Управление копилками
- ✅ Планирование бюджета по месяцам
- ✅ Учет доходов и расходов
- ✅ Категории расходов
- ✅ PWA с офлайн поддержкой
- 🚧 Интеграция с Т-Банком
- 🚧 Аналитика и графики

## Следующие шаги

1. Завершить UI компоненты
2. Добавить страницу месячного бюджета
3. Реализовать интеграцию с банком
4. Добавить аналитику
