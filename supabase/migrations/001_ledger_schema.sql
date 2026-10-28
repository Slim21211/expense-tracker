-- ===============================================
-- 001. Схема учёта на транзакциях
-- ===============================================
-- Только ДОБАВЛЯЕТ объекты. Старые таблицы не трогаются,
-- старая версия приложения продолжит работать.
-- Выполнять в Supabase SQL Editor целиком.

begin;

-- Общий триггер updated_at (мог уже существовать)
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- -----------------------------------------------
-- Счета: где лежат деньги
--   regular — карты/наличные, участвуют в бюджете месяца
--   savings — копилки, вне бюджета
--   credit  — кредиты, баланс отрицательный = сколько должен
-- -----------------------------------------------
create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  kind text not null check (kind in ('regular', 'savings', 'credit')),
  icon text not null default '💳',
  color text not null default '#6366f1',
  target_amount numeric(14, 2), -- цель копилки / сумма кредита
  sort_order integer not null default 0,
  is_archived boolean not null default false,
  system_key text, -- служебная метка для миграции ('legacy_main', 'legacy_leftovers')
  legacy_piggy_bank_id uuid unique references public.piggy_banks(id) on delete set null,
  legacy_credit_id uuid unique references public.credits(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, system_key)
);

create index if not exists idx_accounts_user on public.accounts(user_id);

alter table public.accounts enable row level security;
drop policy if exists "Users manage own accounts" on public.accounts;
create policy "Users manage own accounts" on public.accounts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop trigger if exists set_updated_at on public.accounts;
create trigger set_updated_at before update on public.accounts
  for each row execute function public.handle_updated_at();

-- -----------------------------------------------
-- Категории: архивирование вместо удаления
-- -----------------------------------------------
alter table public.expense_categories
  add column if not exists is_archived boolean not null default false;

-- -----------------------------------------------
-- Транзакции: единственный источник правды о деньгах
--   income     — извне на счёт           (from = null)
--   expense    — со счёта наружу         (to = null)
--   transfer   — со счёта на счёт
--   adjustment — корректировка баланса   (ровно один из from/to)
-- -----------------------------------------------
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  kind text not null check (kind in ('income', 'expense', 'transfer', 'adjustment')),
  amount numeric(14, 2) not null check (amount > 0),
  from_account_id uuid references public.accounts(id) on delete restrict,
  to_account_id uuid references public.accounts(id) on delete restrict,
  category_id uuid references public.expense_categories(id) on delete restrict,
  budget_month_id uuid references public.budget_months(id) on delete restrict,
  income_item_id uuid references public.income_items(id) on delete restrict,
  date date not null default current_date,
  description text,
  legacy_source text, -- откуда перенесено (для повторного запуска миграции)
  legacy_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint transactions_shape check (
    (kind = 'income' and from_account_id is null and to_account_id is not null) or
    (kind = 'expense' and from_account_id is not null and to_account_id is null) or
    (kind = 'transfer' and from_account_id is not null and to_account_id is not null
      and from_account_id <> to_account_id) or
    (kind = 'adjustment' and (from_account_id is null) <> (to_account_id is null))
  )
);

create index if not exists idx_transactions_user_date on public.transactions(user_id, date desc);
create index if not exists idx_transactions_month on public.transactions(budget_month_id);
create index if not exists idx_transactions_income on public.transactions(income_item_id);
create index if not exists idx_transactions_from on public.transactions(from_account_id);
create index if not exists idx_transactions_to on public.transactions(to_account_id);
create index if not exists idx_transactions_category on public.transactions(category_id);
create unique index if not exists idx_transactions_legacy
  on public.transactions(legacy_source, legacy_id) where legacy_source is not null;

alter table public.transactions enable row level security;
drop policy if exists "Users manage own transactions" on public.transactions;
create policy "Users manage own transactions" on public.transactions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Месяц берётся из дохода; счета должны принадлежать владельцу транзакции
create or replace function public.transactions_before_write()
returns trigger as $$
begin
  if new.income_item_id is not null then
    select budget_month_id into new.budget_month_id
    from public.income_items where id = new.income_item_id;
  end if;

  if new.from_account_id is not null and not exists (
    select 1 from public.accounts where id = new.from_account_id and user_id = new.user_id
  ) then
    raise exception 'Счёт списания не найден';
  end if;

  if new.to_account_id is not null and not exists (
    select 1 from public.accounts where id = new.to_account_id and user_id = new.user_id
  ) then
    raise exception 'Счёт зачисления не найден';
  end if;

  return new;
end;
$$ language plpgsql;

drop trigger if exists transactions_before_write on public.transactions;
create trigger transactions_before_write before insert or update on public.transactions
  for each row execute function public.transactions_before_write();

drop trigger if exists set_updated_at on public.transactions;
create trigger set_updated_at before update on public.transactions
  for each row execute function public.handle_updated_at();

-- -----------------------------------------------
-- Планы расходов: нормальная связь с доходом вместо поля name,
-- план может быть на категорию ИЛИ на перевод в копилку/кредит
-- -----------------------------------------------
alter table public.expense_items
  add column if not exists income_item_id uuid references public.income_items(id) on delete cascade,
  add column if not exists target_account_id uuid references public.accounts(id) on delete restrict;

alter table public.expense_items alter column category_id drop not null;

alter table public.expense_items drop constraint if exists expense_items_target_check;
alter table public.expense_items add constraint expense_items_target_check
  check (category_id is not null or target_account_id is not null);

create index if not exists idx_expense_items_income on public.expense_items(income_item_id);

-- -----------------------------------------------
-- Балансы — всегда вычисляются, нигде не хранятся
-- -----------------------------------------------
create or replace view public.account_balances
with (security_invoker = true) as
select
  a.id as account_id,
  coalesce(sum(case when t.to_account_id = a.id then t.amount else -t.amount end), 0)::numeric(14, 2) as balance
from public.accounts a
left join public.transactions t
  on t.to_account_id = a.id or t.from_account_id = a.id
group by a.id;

-- Итоги месяца.
-- Поступления — деньги, пришедшие на regular-счета извне или из копилок/кредитов.
-- Расходы — деньги, ушедшие с regular-счетов наружу или в копилки/кредиты.
-- Переводы между regular-счетами на бюджет не влияют.
create or replace view public.budget_month_totals
with (security_invoker = true) as
select
  m.id as budget_month_id,
  coalesce((select sum(i.planned_amount) from public.income_items i where i.budget_month_id = m.id), 0) as planned_income,
  coalesce((select sum(e.planned_amount) from public.expense_items e where e.budget_month_id = m.id), 0) as planned_expenses,
  coalesce(sum(t.amount) filter (
    where ta.kind = 'regular' and (fa.id is null or fa.kind <> 'regular')
  ), 0) as actual_income,
  coalesce(sum(t.amount) filter (
    where fa.kind = 'regular' and (ta.id is null or ta.kind <> 'regular')
  ), 0) as actual_expenses
from public.budget_months m
left join public.transactions t on t.budget_month_id = m.id
left join public.accounts fa on fa.id = t.from_account_id
left join public.accounts ta on ta.id = t.to_account_id
group by m.id;

grant select on public.account_balances, public.budget_month_totals to authenticated;

commit;
