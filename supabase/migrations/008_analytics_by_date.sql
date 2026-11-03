-- ===============================================
-- 008. Аналитика по дате операции, «План и факт» — по бюджету
-- ===============================================
-- Месяц трат и доходов в аналитике — календарный месяц даты операции:
-- траты 1–4 ноября — это ноябрь, даже если оплачены из октябрьского аванса.
-- Сравнение с планом остаётся по месяцу бюджета (analytics_budget_spending):
-- план относится к доходу, и трата из него сравнивается с его планом.
-- Только представления, данные не меняются, повторный запуск безопасен.

create or replace view public.analytics_spending
with (security_invoker = true) as
select
  extract(year from t.date)::int as year,
  extract(month from t.date)::int as month,
  t.category_id,
  sum(t.amount)::numeric(14, 2) as amount,
  t.from_account_id as account_id
from public.transactions t
where t.kind = 'expense'
group by 1, 2, 3, 5;

create or replace view public.analytics_months
with (security_invoker = true) as
select
  extract(year from t.date)::int as year,
  extract(month from t.date)::int as month,
  coalesce(sum(t.amount) filter (where t.kind = 'income'), 0)::numeric(14, 2) as income,
  coalesce(sum(t.amount) filter (where t.kind = 'expense'), 0)::numeric(14, 2) as spending
from public.transactions t
group by 1, 2;

-- Траты по месяцу бюджета — для сравнения с планом (вне бюджета не входят)
create or replace view public.analytics_budget_spending
with (security_invoker = true) as
select
  m.year,
  m.month,
  t.category_id,
  sum(t.amount)::numeric(14, 2) as amount,
  t.from_account_id as account_id
from public.transactions t
join public.budget_months m on m.id = t.budget_month_id
where t.kind = 'expense'
group by 1, 2, 3, 5;

grant select on public.analytics_budget_spending to authenticated;
