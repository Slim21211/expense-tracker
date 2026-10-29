-- ===============================================
-- 004. Долг перед копилкой
-- ===============================================
-- У перевода появляется назначение:
--   loan      — взял из копилки в долг (копилка → карта)
--   repayment — вернул долг (карта → копилка)
-- Обычные переводы — без назначения.
-- Долг копилки = ручная поправка (opening_debt) + взято в долг − возвращено.
-- На балансы и бюджет ни назначение, ни поправка не влияют.
-- Старые операции не размечаются: долг, который уже есть, вписывается
-- в поле «Долг» у копилки — интерфейс сохраняет разницу в opening_debt.
-- Операторы самостоятельные, повторный запуск безопасен.

alter table public.transactions
  add column if not exists purpose text;

alter table public.transactions drop constraint if exists transactions_purpose_check;
alter table public.transactions add constraint transactions_purpose_check
  check (purpose is null or (kind = 'transfer' and purpose in ('loan', 'repayment')));

alter table public.accounts
  add column if not exists opening_debt numeric(14, 2) not null default 0;

-- Баланс и долг каждого счёта. Колонка debt добавлена в конец — существующий
-- код, читающий account_id и balance, продолжает работать
create or replace view public.account_balances
with (security_invoker = true) as
select
  a.id as account_id,
  coalesce(sum(case when t.to_account_id = a.id then t.amount else -t.amount end), 0)::numeric(14, 2) as balance,
  (a.opening_debt
   + coalesce(sum(t.amount) filter (where t.purpose = 'loan' and t.from_account_id = a.id), 0)
   - coalesce(sum(t.amount) filter (where t.purpose = 'repayment' and t.to_account_id = a.id), 0)
  )::numeric(14, 2) as debt
from public.accounts a
left join public.transactions t
  on t.to_account_id = a.id or t.from_account_id = a.id
group by a.id;

grant select on public.account_balances to authenticated;
