-- ===============================================
-- 002. Перенос истории в транзакции
-- ===============================================
-- Запускать после 001. МОЖНО ЗАПУСКАТЬ ПОВТОРНО: перенесённые
-- транзакции (legacy_source is not null) удаляются и создаются заново,
-- транзакции, внесённые в новом интерфейсе, не трогаются.
-- Старые таблицы только читаются.
--
-- Весь перенос — один оператор DO: он выполняется целиком в одной
-- транзакции и сессии (SQL Editor может отправлять отдельные запросы
-- скрипта в разные соединения). Если что-то упадёт, ничего не изменится.
-- После него — запрос сверки.

do $migration$
begin
  -- Остатки неудачных запусков прошлых версий скрипта
  drop schema if exists ledger_migration cascade;
  drop view if exists pg_temp._staging_norm, pg_temp._legacy_balances;
  drop table if exists pg_temp._staging, pg_temp._cat_target;

  -- -----------------------------------------------
  -- 1. Счета
  -- -----------------------------------------------

  -- Основная карта — по одной на каждого пользователя с данными
  insert into public.accounts (user_id, name, kind, icon, color, system_key, sort_order)
  select u.user_id, 'Основная карта', 'regular', '💳', '#6366f1', 'legacy_main', 0
  from (
    select user_id from public.budget_months
    union select user_id from public.piggy_banks
    union select user_id from public.credits
  ) u
  on conflict (user_id, system_key) do nothing;

  -- Личный счёт, куда уходили «Остатки»
  insert into public.accounts (user_id, name, kind, icon, color, system_key, sort_order)
  select distinct et.user_id, 'Личный счёт (остатки)', 'savings', '🗄️', '#64748b', 'legacy_leftovers', 50
  from public.expense_transactions et
  join public.expense_categories c on c.id = et.category_id
  where lower(trim(c.name)) = 'остатки'
  on conflict (user_id, system_key) do nothing;

  -- Копилки
  insert into public.accounts (user_id, name, kind, icon, color, target_amount, is_archived, legacy_piggy_bank_id, sort_order, created_at)
  select p.user_id, p.name, 'savings', coalesce(p.icon, '💰'), coalesce(p.color, '#6366f1'),
         nullif(p.target_amount, 0), coalesce(p.is_archived, false), p.id, 100, p.created_at
  from public.piggy_banks p
  on conflict (legacy_piggy_bank_id) do nothing;

  -- Кредиты
  insert into public.accounts (user_id, name, kind, icon, color, target_amount, is_archived, legacy_credit_id, sort_order, created_at)
  select c.user_id, c.name, 'credit', coalesce(c.icon, '💳'), coalesce(c.color, '#ef4444'),
         c.target_amount, coalesce(c.is_archived, false), c.id, 200, c.created_at
  from public.credits c
  on conflict (legacy_credit_id) do nothing;

  -- -----------------------------------------------
  -- 2. Какие категории на самом деле были переводами
  --    (старый код связывал их с копилкой/кредитом по имени)
  -- -----------------------------------------------
  create temp table _cat_target as
  select distinct on (u.user_id, c.id)
    u.user_id, c.id as category_id, a.id as account_id
  from (
    select user_id, category_id from public.expense_transactions
    union select user_id, category_id from public.expense_items where category_id is not null
    union select user_id, id from public.expense_categories where user_id is not null
  ) u
  join public.expense_categories c on c.id = u.category_id
  join public.accounts a on a.user_id = u.user_id and (
    (a.system_key = 'legacy_leftovers' and lower(trim(c.name)) = 'остатки')
    or ((a.legacy_piggy_bank_id is not null or a.legacy_credit_id is not null) and a.name = c.name)
  )
  order by u.user_id, c.id, (a.system_key is not null) desc, a.is_archived, a.created_at;

  -- -----------------------------------------------
  -- 3. Перенос операций
  --    Сначала в промежуточную таблицу со знаком,
  --    отрицательные суммы разворачиваются (возврат = обратная операция)
  -- -----------------------------------------------
  delete from public.transactions where legacy_source is not null;

  create temp table _staging (
    user_id uuid, kind text, amount numeric,
    from_id uuid, to_id uuid, category_id uuid,
    budget_month_id uuid, income_item_id uuid,
    date date, description text, created_at timestamptz,
    legacy_source text, legacy_id uuid
  );

  -- Фактические расходы
  insert into _staging
  select et.user_id,
         case when ct.account_id is null then 'expense' else 'transfer' end,
         et.amount, main.id, ct.account_id,
         case when ct.account_id is null then et.category_id end,
         et.budget_month_id, et.income_item_id,
         coalesce(et.transaction_date, (et.created_at at time zone 'Europe/Moscow')::date),
         et.description, et.created_at, 'expense_transaction', et.id
  from public.expense_transactions et
  join public.accounts main on main.user_id = et.user_id and main.system_key = 'legacy_main'
  left join _cat_target ct on ct.user_id = et.user_id and ct.category_id = et.category_id;

  -- Взятие в долг из копилки → перевод копилка → карта
  insert into _staging
  select d.user_id, 'transfer', d.amount, pa.id, main.id, null,
         i.budget_month_id, d.income_item_id,
         (d.created_at at time zone 'Europe/Moscow')::date,
         coalesce(d.description, 'Взято из копилки'), d.created_at, 'income_debt', d.id
  from public.income_debts d
  join public.income_items i on i.id = d.income_item_id
  join public.accounts pa on pa.legacy_piggy_bank_id = d.piggy_bank_id
  join public.accounts main on main.user_id = d.user_id and main.system_key = 'legacy_main';

  -- Фактический доход. actual_amount включал долги из копилок — вычитаем их.
  -- Если получилось < 0 (поле перезаписывали вручную) — строка попадёт в сверку.
  insert into _staging
  select i.user_id, 'income', coalesce(i.actual_amount, 0) - coalesce(d.total, 0),
         null, main.id, null,
         i.budget_month_id, i.id,
         coalesce(i.actual_date, i.planned_date, make_date(m.year, m.month, 1)),
         i.name, i.created_at, 'income_item', i.id
  from public.income_items i
  join public.budget_months m on m.id = i.budget_month_id
  join public.accounts main on main.user_id = i.user_id and main.system_key = 'legacy_main'
  left join (
    select income_item_id, sum(amount) as total from public.income_debts group by income_item_id
  ) d on d.income_item_id = i.id
  where coalesce(i.actual_amount, 0) - coalesce(d.total, 0) > 0;

  -- Операции копилок
  insert into _staging
  select pt.user_id,
         case pt.type when 'expense' then 'expense' when 'deposit' then 'income' else 'transfer' end,
         pt.amount,
         case pt.type when 'expense' then pa.id when 'debt' then pa.id when 'debt_repay' then main.id end,
         case pt.type when 'deposit' then pa.id when 'debt' then main.id when 'debt_repay' then pa.id end,
         null, null, null,
         (coalesce(pt.transaction_date, pt.created_at) at time zone 'Europe/Moscow')::date,
         pt.description, pt.created_at, 'piggy_bank_transaction', pt.id
  from public.piggy_bank_transactions pt
  join public.accounts pa on pa.legacy_piggy_bank_id = pt.piggy_bank_id
  join public.accounts main on main.user_id = pt.user_id and main.system_key = 'legacy_main'
  -- Старая версия при взятии в долг писала и income_debts, и запись в историю копилки.
  -- Долг уже перенесён из income_debts (с привязкой к доходу) — дубль пропускаем.
  where not (
    pt.type = 'debt' and exists (
      select 1 from public.income_debts d
      where d.piggy_bank_id = pt.piggy_bank_id
        and d.amount = pt.amount
        and (d.created_at at time zone 'Europe/Moscow')::date
          = (coalesce(pt.transaction_date, pt.created_at) at time zone 'Europe/Moscow')::date
    )
  );

  -- Тело кредита: долг появляется в момент создания кредита
  insert into _staging
  select c.user_id, 'adjustment', c.target_amount, a.id, null, null, null, null,
         (c.created_at at time zone 'Europe/Moscow')::date,
         'Сумма кредита', c.created_at, 'credit_principal', c.id
  from public.credits c
  join public.accounts a on a.legacy_credit_id = c.id
  where c.target_amount <> 0;

  -- Нормализованный вид промежуточной таблицы: модуль суммы, направление по знаку
  create temp view _staging_norm as
  select user_id,
         case when amount < 0 then
           case kind when 'expense' then 'income' when 'income' then 'expense' else kind end
         else kind end as kind,
         round(abs(amount), 2) as amount,
         case when amount < 0 then to_id else from_id end as from_id,
         case when amount < 0 then from_id else to_id end as to_id,
         category_id, budget_month_id, income_item_id, date, description, created_at,
         legacy_source, legacy_id
  from _staging
  where round(abs(amount), 2) > 0;

  insert into public.transactions (
    user_id, kind, amount, from_account_id, to_account_id, category_id,
    budget_month_id, income_item_id, date, description, created_at, legacy_source, legacy_id
  )
  select * from _staging_norm;
  delete from _staging;

  -- -----------------------------------------------
  -- 4. Сведение балансов копилок и кредитов к старым значениям.
  --    Пополнения копилок раньше не записывались — разница
  --    становится одной корректировкой «начальный остаток».
  --    Считаем только по перенесённым операциям, чтобы повторный запуск
  --    не «съедал» операции, внесённые в новом интерфейсе.
  -- -----------------------------------------------
  create temp view _legacy_balances as
  select a.id as account_id,
         coalesce(sum(case when t.to_account_id = a.id then t.amount else -t.amount end), 0) as balance
  from public.accounts a
  left join public.transactions t
    on (t.to_account_id = a.id or t.from_account_id = a.id) and t.legacy_source is not null
  group by a.id;

  insert into _staging
  select a.user_id, 'adjustment', p.current_amount - b.balance, null, a.id, null, null, null,
         (p.created_at at time zone 'Europe/Moscow')::date,
         'Начальный остаток (пополнения из старой версии)', p.created_at, 'piggy_opening', p.id
  from public.accounts a
  join public.piggy_banks p on p.id = a.legacy_piggy_bank_id
  join _legacy_balances b on b.account_id = a.id;

  insert into _staging
  select a.user_id, 'adjustment', -(c.target_amount - c.paid_amount) - b.balance, null, a.id, null, null, null,
         (c.created_at at time zone 'Europe/Moscow')::date,
         'Погашено до начала учёта', c.created_at, 'credit_opening', c.id
  from public.accounts a
  join public.credits c on c.id = a.legacy_credit_id
  join _legacy_balances b on b.account_id = a.id;

  insert into public.transactions (
    user_id, kind, amount, from_account_id, to_account_id, category_id,
    budget_month_id, income_item_id, date, description, created_at, legacy_source, legacy_id
  )
  select * from _staging_norm;

  -- -----------------------------------------------
  -- 5. Планы и категории
  -- -----------------------------------------------
  update public.expense_items e
  set income_item_id = i.id
  from public.income_items i
  where e.income_item_id is null and i.id::text = e.name;

  update public.expense_items e
  set target_account_id = ct.account_id
  from _cat_target ct
  where e.target_account_id is null
    and ct.user_id = e.user_id and ct.category_id = e.category_id;

  -- Категории-двойники копилок/кредитов/остатков больше не нужны в списке.
  -- Только собственные категории пользователя: архив общих (user_id is null)
  -- скрыл бы их у всех пользователей.
  update public.expense_categories c
  set is_archived = true
  where c.user_id is not null
    and exists (
      select 1 from _cat_target ct
      where ct.category_id = c.id and ct.user_id = c.user_id
    );

  drop view _staging_norm;
  drop view _legacy_balances;
  drop table _staging;
  drop table _cat_target;
end
$migration$;

-- -----------------------------------------------
-- 6. Сверка. Смотри колонку «разница»: для копилок и кредитов
--    она должна быть 0, для месяцев — пусто или объяснимо.
-- -----------------------------------------------
select * from (
  select 1 as ord, 'Копилка' as "проверка", p.name as "объект",
         p.current_amount as "было", b.balance as "стало",
         b.balance - p.current_amount as "разница",
         'начальный остаток: ' || coalesce((
           select case when t.to_account_id is not null then t.amount else -t.amount end
           from public.transactions t where t.legacy_source = 'piggy_opening' and t.legacy_id = p.id
         ), 0) as "примечание"
  from public.piggy_banks p
  join public.accounts a on a.legacy_piggy_bank_id = p.id
  join public.account_balances b on b.account_id = a.id

  union all
  select 2, 'Кредит (баланс = −долг)', c.name,
         -(c.target_amount - c.paid_amount), b.balance,
         b.balance + (c.target_amount - c.paid_amount), null
  from public.credits c
  join public.accounts a on a.legacy_credit_id = c.id
  join public.account_balances b on b.account_id = a.id

  union all
  select 3, 'Счёт', a.name, null, b.balance, null,
         'сверь с реальным балансом, расхождение поправь корректировкой'
  from public.accounts a
  join public.account_balances b on b.account_id = a.id
  where a.system_key = 'legacy_main'

  union all
  select 4, 'Доход меньше взятых долгов', i.name || ' (' || m.month || '.' || m.year || ')',
         i.actual_amount, d.total, null,
         'доход перезаписывали вручную — проверь эту строку в новом интерфейсе'
  from public.income_items i
  join public.budget_months m on m.id = i.budget_month_id
  join (select income_item_id, sum(amount) as total from public.income_debts group by income_item_id) d
    on d.income_item_id = i.id
  where coalesce(i.actual_amount, 0) < d.total

  union all
  select 5, 'Месяц: поступления', m.month || '.' || m.year,
         old.income, t.actual_income, t.actual_income - old.income,
         'ожидаемо: возвраты (траты с минусом) и долги, не попавшие в доход'
  from public.budget_months m
  join public.budget_month_totals t on t.budget_month_id = m.id
  join (select budget_month_id, coalesce(sum(actual_amount), 0) as income
        from public.income_items group by budget_month_id) old on old.budget_month_id = m.id
  where t.actual_income <> old.income

  union all
  select 6, 'Месяц: расходы', m.month || '.' || m.year,
         old.spent, t.actual_expenses, t.actual_expenses - old.spent,
         'ожидаемо: возвраты теперь не вычитаются из расходов, а идут в поступления'
  from public.budget_months m
  join public.budget_month_totals t on t.budget_month_id = m.id
  join (select budget_month_id, sum(amount) as spent
        from public.expense_transactions group by budget_month_id) old on old.budget_month_id = m.id
  where t.actual_expenses <> old.spent

  union all
  select 7, 'Итого перенесено', legacy_source, null, count(*), null, null
  from public.transactions where legacy_source is not null group by legacy_source
) r
order by ord, "объект";
