-- ===============================================
-- Откат 001 + 002 (только если что-то пошло не так ДО перехода)
-- ===============================================
-- Удаляет новые таблицы и колонки. Старые данные не затрагиваются.
-- ВНИМАНИЕ: операции, внесённые в новом интерфейсе, будут потеряны.

begin;

drop view if exists public.budget_month_totals;
drop view if exists public.account_balances;
drop table if exists public.transactions;

alter table public.expense_items drop constraint if exists expense_items_target_check;
alter table public.expense_items drop column if exists target_account_id;
alter table public.expense_items drop column if exists income_item_id;
-- category_id остаётся nullable: вернуть NOT NULL можно, только если нет планов без категории
-- alter table public.expense_items alter column category_id set not null;

drop table if exists public.accounts;
drop function if exists public.transactions_before_write();

alter table public.expense_categories drop column if exists is_archived;

commit;
