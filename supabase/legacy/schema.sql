-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (расширение профиля пользователя)
CREATE TABLE public.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Копилки (Piggy Banks)
CREATE TABLE public.piggy_banks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    target_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
    current_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
    color TEXT DEFAULT '#6366f1', -- цвет для UI
    icon TEXT DEFAULT '💰', -- эмодзи или иконка
    is_archived BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Месяцы/периоды учета
CREATE TABLE public.budget_months (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
    year INTEGER NOT NULL CHECK (year >= 2000),
    name TEXT, -- например "Декабрь 2024"
    is_archived BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, month, year)
);

-- Категории расходов (предустановленные + пользовательские)
CREATE TABLE public.expense_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- NULL для системных категорий
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('constant', 'variable')), -- постоянные или переменные
    icon TEXT DEFAULT '📦',
    color TEXT DEFAULT '#94a3b8',
    is_system BOOLEAN DEFAULT FALSE, -- системная категория
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Доходы
CREATE TABLE public.income_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    budget_month_id UUID NOT NULL REFERENCES public.budget_months(id) ON DELETE CASCADE,
    name TEXT NOT NULL, -- "Аванс", "Зарплата"
    planned_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
    actual_amount DECIMAL(12, 2) DEFAULT 0,
    planned_date DATE,
    actual_date DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Расходы
CREATE TABLE public.expense_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    budget_month_id UUID NOT NULL REFERENCES public.budget_months(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES public.expense_categories(id) ON DELETE RESTRICT,
    name TEXT, -- опционально, если нужно уточнить
    planned_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
    actual_amount DECIMAL(12, 2) DEFAULT 0,
    transaction_date DATE,
    notes TEXT,
    is_from_bank BOOLEAN DEFAULT FALSE, -- автоматически из банка или вручную
    bank_transaction_id TEXT, -- ID транзакции из банка для дедупликации
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Транзакции банка (для интеграции с Т-Банком)
CREATE TABLE public.bank_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    bank_transaction_id TEXT NOT NULL, -- ID из банка
    amount DECIMAL(12, 2) NOT NULL,
    currency TEXT DEFAULT 'RUB',
    description TEXT,
    category TEXT, -- категория от банка
    transaction_date TIMESTAMP WITH TIME ZONE NOT NULL,
    is_processed BOOLEAN DEFAULT FALSE, -- обработана ли транзакция
    linked_expense_id UUID REFERENCES public.expense_items(id) ON DELETE SET NULL,
    raw_data JSONB, -- полные данные от банка
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, bank_transaction_id)
);

-- Настройки интеграции с банком
CREATE TABLE public.bank_integrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    bank_name TEXT NOT NULL DEFAULT 'tinkoff',
    access_token_encrypted TEXT, -- зашифрованный токен
    is_active BOOLEAN DEFAULT FALSE,
    last_sync_at TIMESTAMP WITH TIME ZONE,
    sync_frequency TEXT DEFAULT 'daily', -- hourly, daily, manual
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, bank_name)
);

-- Индексы для производительности
CREATE INDEX idx_piggy_banks_user ON public.piggy_banks(user_id) WHERE NOT is_archived;
CREATE INDEX idx_budget_months_user ON public.budget_months(user_id, year DESC, month DESC);
CREATE INDEX idx_income_items_month ON public.income_items(budget_month_id);
CREATE INDEX idx_expense_items_month ON public.expense_items(budget_month_id);
CREATE INDEX idx_expense_items_category ON public.expense_items(category_id);
CREATE INDEX idx_bank_transactions_user ON public.bank_transactions(user_id, transaction_date DESC);
CREATE INDEX idx_bank_transactions_unprocessed ON public.bank_transactions(user_id) WHERE NOT is_processed;

-- Row Level Security (RLS)
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.piggy_banks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_months ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.income_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_integrations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- User Profiles
CREATE POLICY "Users can view own profile" ON public.user_profiles
    FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.user_profiles
    FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.user_profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Piggy Banks
CREATE POLICY "Users can view own piggy banks" ON public.piggy_banks
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own piggy banks" ON public.piggy_banks
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own piggy banks" ON public.piggy_banks
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own piggy banks" ON public.piggy_banks
    FOR DELETE USING (auth.uid() = user_id);

-- Budget Months
CREATE POLICY "Users can view own budget months" ON public.budget_months
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own budget months" ON public.budget_months
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own budget months" ON public.budget_months
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own budget months" ON public.budget_months
    FOR DELETE USING (auth.uid() = user_id);

-- Expense Categories
CREATE POLICY "Users can view categories" ON public.expense_categories
    FOR SELECT USING (is_system = true OR auth.uid() = user_id);
CREATE POLICY "Users can insert own categories" ON public.expense_categories
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own categories" ON public.expense_categories
    FOR UPDATE USING (auth.uid() = user_id AND is_system = false);
CREATE POLICY "Users can delete own categories" ON public.expense_categories
    FOR DELETE USING (auth.uid() = user_id AND is_system = false);

-- Income Items
CREATE POLICY "Users can view own income" ON public.income_items
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own income" ON public.income_items
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own income" ON public.income_items
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own income" ON public.income_items
    FOR DELETE USING (auth.uid() = user_id);

-- Expense Items
CREATE POLICY "Users can view own expenses" ON public.expense_items
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own expenses" ON public.expense_items
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own expenses" ON public.expense_items
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own expenses" ON public.expense_items
    FOR DELETE USING (auth.uid() = user_id);

-- Bank Transactions
CREATE POLICY "Users can view own bank transactions" ON public.bank_transactions
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own bank transactions" ON public.bank_transactions
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own bank transactions" ON public.bank_transactions
    FOR UPDATE USING (auth.uid() = user_id);

-- Bank Integrations
CREATE POLICY "Users can view own bank integrations" ON public.bank_integrations
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own bank integrations" ON public.bank_integrations
    FOR ALL USING (auth.uid() = user_id);

-- Функции и триггеры для updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.user_profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.piggy_banks
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.budget_months
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.income_items
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.expense_items
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.bank_integrations
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Вставка системных категорий расходов
INSERT INTO public.expense_categories (name, type, icon, color, is_system, sort_order) VALUES
    -- Постоянные расходы
    ('Квартира', 'constant', '🏠', '#ef4444', true, 1),
    ('Связь', 'constant', '📱', '#f59e0b', true, 2),
    ('Подписки', 'constant', '📺', '#8b5cf6', true, 3),
    ('Кредиты', 'constant', '💳', '#dc2626', true, 4),
    ('Страховки', 'constant', '🛡️', '#06b6d4', true, 5),
    
    -- Переменные расходы
    ('Продукты', 'variable', '🛒', '#10b981', true, 10),
    ('Рестораны', 'variable', '🍽️', '#f97316', true, 11),
    ('Транспорт', 'variable', '🚗', '#3b82f6', true, 12),
    ('Развлечения', 'variable', '🎮', '#ec4899', true, 13),
    ('Здоровье', 'variable', '💊', '#14b8a6', true, 14),
    ('Одежда', 'variable', '👕', '#a855f7', true, 15),
    ('Подарки', 'variable', '🎁', '#f43f5e', true, 16),
    ('Образование', 'variable', '📚', '#0ea5e9', true, 17),
    ('Прочее', 'variable', '📦', '#6b7280', true, 18);
