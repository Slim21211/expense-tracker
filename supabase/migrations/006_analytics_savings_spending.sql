-- ===============================================
-- 006. Траты из копилок в аналитике
-- ===============================================
-- Расход из копилки без категории — это трата на цель копилки
-- («Отпуск» → траты на отпуск). Представлению нужен счёт списания,
-- чтобы показывать такие траты строкой копилки, а не «Без категории».
-- Колонка account_id добавлена в конец; данные не меняются.

create or replace view public.analytics_spending
with (security_invoker = true) as
select
  coalesce(m.year, extract(year from t.date)::int) as year,
  coalesce(m.month, extract(month from t.date)::int) as month,
  t.category_id,
  sum(t.amount)::numeric(14, 2) as amount,
  -- Только для трат без категории: из какого счёта списано
  case when t.category_id is null then t.from_account_id end as account_id
from public.transactions t
left join public.budget_months m on m.id = t.budget_month_id
where t.kind = 'expense'
group by 1, 2, 3, 5;

grant select on public.analytics_spending to authenticated;
