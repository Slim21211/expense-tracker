-- ===============================================
-- 007. Возврат долга доходом, траты из копилок вне плана
-- ===============================================
-- 1. «В счёт долга» можно отметить и доход, зачисленный прямо в копилку
--    (премия гасит долг). Займ — по-прежнему только перевод из копилки.
--    Расчёт долга в account_balances тип операции не проверяет — менять не нужно.
-- 2. analytics_spending отдаёт счёт списания у всех трат: аналитике нужно
--    отличать траты из бюджета от трат из копилок (они не сравниваются с планом).
-- Повторный запуск безопасен, данные не меняются.

alter table public.transactions drop constraint if exists transactions_purpose_check;
alter table public.transactions add constraint transactions_purpose_check
  check (
    purpose is null
    or (kind = 'transfer' and purpose in ('loan', 'repayment'))
    or (kind = 'income' and purpose = 'repayment')
  );

create or replace view public.analytics_spending
with (security_invoker = true) as
select
  coalesce(m.year, extract(year from t.date)::int) as year,
  coalesce(m.month, extract(month from t.date)::int) as month,
  t.category_id,
  sum(t.amount)::numeric(14, 2) as amount,
  -- Счёт списания: по нему трата без категории из копилки показывается строкой
  -- копилки, а траты из копилок не попадают в сравнение с планом
  t.from_account_id as account_id
from public.transactions t
left join public.budget_months m on m.id = t.budget_month_id
where t.kind = 'expense'
group by 1, 2, 3, 5;

grant select on public.analytics_spending to authenticated;
