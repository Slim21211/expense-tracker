-- ===============================================
-- 005. Представления для аналитики
-- ===============================================
-- Итоги считаются в базе, чтобы не выгружать в браузер все операции.
-- Месяц операции — месяц бюджета, а если операция вне бюджета — месяц её даты.
-- security_invoker: каждый пользователь видит только свои данные (RLS).
-- Только создаёт представления, повторный запуск безопасен.

-- Траты по категориям за месяц (только расходы: переводы и корректировки не траты)
create or replace view public.analytics_spending
with (security_invoker = true) as
select
  coalesce(m.year, extract(year from t.date)::int) as year,
  coalesce(m.month, extract(month from t.date)::int) as month,
  t.category_id,
  sum(t.amount)::numeric(14, 2) as amount
from public.transactions t
left join public.budget_months m on m.id = t.budget_month_id
where t.kind = 'expense'
group by 1, 2, 3;

-- План трат по категориям за месяц (строки плана на переводы в копилки не входят)
create or replace view public.analytics_plan
with (security_invoker = true) as
select
  m.year,
  m.month,
  e.category_id,
  sum(e.planned_amount)::numeric(14, 2) as planned
from public.expense_items e
join public.budget_months m on m.id = e.budget_month_id
where e.target_account_id is null and e.category_id is not null
group by 1, 2, 3;

-- Итоги месяца: доход, траты и сколько отложено в копилки
create or replace view public.analytics_months
with (security_invoker = true) as
select
  coalesce(m.year, extract(year from t.date)::int) as year,
  coalesce(m.month, extract(month from t.date)::int) as month,
  coalesce(sum(t.amount) filter (where t.kind = 'income'), 0)::numeric(14, 2) as income,
  coalesce(sum(t.amount) filter (where t.kind = 'expense'), 0)::numeric(14, 2) as spending
from public.transactions t
left join public.budget_months m on m.id = t.budget_month_id
group by 1, 2;

-- Изменение баланса каждого счёта по календарным месяцам —
-- из него на клиенте строится баланс копилок на конец каждого месяца
create or replace view public.analytics_account_flows
with (security_invoker = true) as
select
  a.id as account_id,
  extract(year from t.date)::int as year,
  extract(month from t.date)::int as month,
  sum(case when t.to_account_id = a.id then t.amount else -t.amount end)::numeric(14, 2) as delta
from public.accounts a
join public.transactions t on t.to_account_id = a.id or t.from_account_id = a.id
group by 1, 2, 3;

grant select on
  public.analytics_spending,
  public.analytics_plan,
  public.analytics_months,
  public.analytics_account_flows
to authenticated;
