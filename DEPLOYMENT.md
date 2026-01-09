# Деплой приложения

## 1. Настройка Supabase

### Создание проекта
1. Перейдите на https://supabase.com
2. Создайте новый проект
3. Запомните URL и anon ключ

### Настройка базы данных
1. Откройте SQL Editor в Supabase Dashboard
2. Скопируйте содержимое файла `supabase/schema.sql`
3. Выполните скрипт

### Настройка аутентификации
1. Перейдите в Authentication > Providers
2. Включите Email провайдер
3. Настройте email templates (опционально)

## 2. Настройка локального окружения

```bash
# Установите зависимости
npm install

# Создайте .env файл
cp .env.example .env

# Добавьте ваши ключи Supabase в .env
# VITE_SUPABASE_URL=your_url
# VITE_SUPABASE_ANON_KEY=your_key

# Запустите dev сервер
npm run dev
```

## 3. Деплой на Vercel

### Через GitHub (рекомендуется)
1. Загрузите код на GitHub
2. Перейдите на https://vercel.com
3. Импортируйте проект из GitHub
4. Настройте Environment Variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Нажмите Deploy

### Через Vercel CLI
```bash
# Установите Vercel CLI
npm i -g vercel

# Войдите в аккаунт
vercel login

# Деплой
vercel

# Добавьте environment variables
vercel env add VITE_SUPABASE_URL
vercel env add VITE_SUPABASE_ANON_KEY

# Production деплой
vercel --prod
```

## 4. PWA настройка

После деплоя:
1. Проверьте что приложение доступно по HTTPS
2. Откройте приложение на мобильном устройстве
3. В браузере выберите "Добавить на главный экран"
4. Приложение появится как нативное

## 5. Настройка домена (опционально)

В Vercel Dashboard:
1. Перейдите в Settings > Domains
2. Добавьте ваш домен
3. Настройте DNS записи
4. Дождитесь активации SSL

## 6. Мониторинг

### Vercel Analytics
1. Включите Analytics в Vercel Dashboard
2. Просматривайте статистику посещений

### Supabase Monitoring
1. Database > Usage
2. Auth > Users
3. Storage > Settings

## Проблемы и решения

### Ошибка "Invalid API key"
- Проверьте что ключи правильно добавлены в Vercel
- Убедитесь что используете `VITE_` префикс

### PWA не работает
- Проверьте что сайт использует HTTPS
- Очистите кэш браузера
- Проверьте Service Worker в DevTools

### Медленная загрузка
- Проверьте размер bundle (должен быть < 500KB)
- Оптимизируйте изображения
- Включите Vercel Edge Network
