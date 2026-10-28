-- Снимок реальной схемы прода на 2026-10-28, ДО перехода на транзакции.
-- Выгружен из Supabase Dashboard (без триггеров, RLS и ON DELETE).
-- Только для справки — не запускать.

CREATE TABLE public.user_profiles (
  id uuid NOT NULL,
  email text NOT NULL,
  full_name text,
  avatar_url text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_profiles_pkey PRIMARY KEY (id),
  CONSTRAINT user_profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);
CREATE TABLE public.piggy_banks (
  current_amount numeric NOT NULL DEFAULT 0,
  color text DEFAULT '#6366f1'::text,
  user_id uuid NOT NULL,
  name text NOT NULL,
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  target_amount numeric NOT NULL DEFAULT 0,
  icon text DEFAULT '💰'::text,
  is_archived boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT piggy_banks_pkey PRIMARY KEY (id),
  CONSTRAINT piggy_banks_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.budget_months (
  user_id uuid NOT NULL,
  month integer NOT NULL CHECK (month >= 1 AND month <= 12),
  year integer NOT NULL CHECK (year >= 2000),
  name text,
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  is_archived boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT budget_months_pkey PRIMARY KEY (id),
  CONSTRAINT budget_months_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.expense_categories (
  user_id uuid,
  name text NOT NULL,
  type text NOT NULL CHECK (type = ANY (ARRAY['variable'::text, 'fixed'::text])),
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  icon text DEFAULT '📦'::text,
  color text DEFAULT '#94a3b8'::text,
  is_system boolean DEFAULT false,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT expense_categories_pkey PRIMARY KEY (id),
  CONSTRAINT expense_categories_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.income_items (
  user_id uuid NOT NULL,
  budget_month_id uuid NOT NULL,
  name text NOT NULL,
  planned_date date,
  actual_date date,
  notes text,
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  planned_amount numeric NOT NULL DEFAULT 0,
  actual_amount numeric DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT income_items_pkey PRIMARY KEY (id),
  CONSTRAINT income_items_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT income_items_budget_month_id_fkey FOREIGN KEY (budget_month_id) REFERENCES public.budget_months(id)
);
CREATE TABLE public.expense_items (
  user_id uuid NOT NULL,
  budget_month_id uuid NOT NULL,
  category_id uuid NOT NULL,
  name text,
  transaction_date date,
  notes text,
  bank_transaction_id text,
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  planned_amount numeric NOT NULL DEFAULT 0,
  actual_amount numeric DEFAULT 0,
  is_from_bank boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT expense_items_pkey PRIMARY KEY (id),
  CONSTRAINT expense_items_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT expense_items_budget_month_id_fkey FOREIGN KEY (budget_month_id) REFERENCES public.budget_months(id),
  CONSTRAINT expense_items_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.expense_categories(id)
);
CREATE TABLE public.bank_transactions (
  user_id uuid NOT NULL,
  bank_transaction_id text NOT NULL,
  amount numeric NOT NULL,
  description text,
  category text,
  transaction_date timestamp with time zone NOT NULL,
  linked_expense_id uuid,
  raw_data jsonb,
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  currency text DEFAULT 'RUB'::text,
  is_processed boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT bank_transactions_pkey PRIMARY KEY (id),
  CONSTRAINT bank_transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT bank_transactions_linked_expense_id_fkey FOREIGN KEY (linked_expense_id) REFERENCES public.expense_items(id)
);
CREATE TABLE public.bank_integrations (
  user_id uuid NOT NULL,
  access_token_encrypted text,
  last_sync_at timestamp with time zone,
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  bank_name text NOT NULL DEFAULT 'tinkoff'::text,
  is_active boolean DEFAULT false,
  sync_frequency text DEFAULT 'daily'::text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT bank_integrations_pkey PRIMARY KEY (id),
  CONSTRAINT bank_integrations_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.piggy_bank_transactions (
  user_id uuid NOT NULL,
  piggy_bank_id uuid NOT NULL,
  type text NOT NULL CHECK (type = ANY (ARRAY['expense'::text, 'debt'::text, 'deposit'::text, 'debt_repay'::text])),
  amount numeric NOT NULL,
  description text,
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  transaction_date timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT piggy_bank_transactions_pkey PRIMARY KEY (id),
  CONSTRAINT piggy_bank_transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT piggy_bank_transactions_piggy_bank_id_fkey FOREIGN KEY (piggy_bank_id) REFERENCES public.piggy_banks(id)
);
CREATE TABLE public.expense_transactions (
  user_id uuid NOT NULL,
  budget_month_id uuid NOT NULL,
  income_item_id uuid NOT NULL,
  category_id uuid NOT NULL,
  amount numeric NOT NULL,
  description text,
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  transaction_date date DEFAULT CURRENT_DATE,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT expense_transactions_pkey PRIMARY KEY (id),
  CONSTRAINT expense_transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT expense_transactions_budget_month_id_fkey FOREIGN KEY (budget_month_id) REFERENCES public.budget_months(id),
  CONSTRAINT expense_transactions_income_item_id_fkey FOREIGN KEY (income_item_id) REFERENCES public.income_items(id),
  CONSTRAINT expense_transactions_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.expense_categories(id)
);
CREATE TABLE public.income_debts (
  user_id uuid NOT NULL,
  income_item_id uuid NOT NULL,
  piggy_bank_id uuid NOT NULL,
  amount numeric NOT NULL,
  description text,
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT income_debts_pkey PRIMARY KEY (id),
  CONSTRAINT income_debts_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT income_debts_income_item_id_fkey FOREIGN KEY (income_item_id) REFERENCES public.income_items(id),
  CONSTRAINT income_debts_piggy_bank_id_fkey FOREIGN KEY (piggy_bank_id) REFERENCES public.piggy_banks(id)
);
CREATE TABLE public.credits (
  user_id uuid NOT NULL,
  name text NOT NULL,
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  target_amount numeric NOT NULL DEFAULT 0,
  paid_amount numeric NOT NULL DEFAULT 0,
  color text DEFAULT '#ef4444'::text,
  icon text DEFAULT '💳'::text,
  is_archived boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT credits_pkey PRIMARY KEY (id),
  CONSTRAINT credits_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
