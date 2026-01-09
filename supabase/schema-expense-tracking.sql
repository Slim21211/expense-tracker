-- Обновляем expense_items чтобы хранить связь с income_item
-- Используем поле "name" для хранения income_id (связь с доходом)
-- actual_amount теперь накопительная (суммируется)

-- Создаем таблицу для отдельных транзакций расходов
CREATE TABLE IF NOT EXISTS public.expense_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    budget_month_id UUID NOT NULL REFERENCES public.budget_months(id) ON DELETE CASCADE,
    income_item_id UUID NOT NULL REFERENCES public.income_items(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES public.expense_categories(id) ON DELETE CASCADE,
    amount DECIMAL(12, 2) NOT NULL,
    description TEXT,
    transaction_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_expense_transactions_user ON public.expense_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_expense_transactions_income ON public.expense_transactions(income_item_id);
CREATE INDEX IF NOT EXISTS idx_expense_transactions_category ON public.expense_transactions(category_id);

-- RLS
ALTER TABLE public.expense_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own transactions" ON public.expense_transactions
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own transactions" ON public.expense_transactions
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own transactions" ON public.expense_transactions
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own transactions" ON public.expense_transactions
    FOR DELETE USING (auth.uid() = user_id);

-- Создаем таблицу для записи взятия в долг из копилок
CREATE TABLE IF NOT EXISTS public.income_debts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    income_item_id UUID NOT NULL REFERENCES public.income_items(id) ON DELETE CASCADE,
    piggy_bank_id UUID NOT NULL REFERENCES public.piggy_banks(id) ON DELETE CASCADE,
    amount DECIMAL(12, 2) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_income_debts_user ON public.income_debts(user_id);
CREATE INDEX IF NOT EXISTS idx_income_debts_income ON public.income_debts(income_item_id);
CREATE INDEX IF NOT EXISTS idx_income_debts_piggy ON public.income_debts(piggy_bank_id);

-- RLS
ALTER TABLE public.income_debts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own debts" ON public.income_debts
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own debts" ON public.income_debts
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own debts" ON public.income_debts
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own debts" ON public.income_debts
    FOR DELETE USING (auth.uid() = user_id);

-- Триггер для автоматического списания с копилки при взятии в долг
CREATE OR REPLACE FUNCTION public.process_income_debt()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Списываем с копилки
        UPDATE public.piggy_banks 
        SET current_amount = current_amount - NEW.amount
        WHERE id = NEW.piggy_bank_id;
        
        -- Добавляем к фактическому доходу
        UPDATE public.income_items
        SET actual_amount = COALESCE(actual_amount, 0) + NEW.amount
        WHERE id = NEW.income_item_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS income_debt_trigger ON public.income_debts;
CREATE TRIGGER income_debt_trigger
    AFTER INSERT ON public.income_debts
    FOR EACH ROW EXECUTE FUNCTION public.process_income_debt();
