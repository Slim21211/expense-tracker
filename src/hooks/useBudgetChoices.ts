import { useMemo } from 'react';
import { useGetBudgetMonthsQuery, useGetIncomeChoicesQuery } from '@/services/api';
import type { IncomeChoice } from '@/services/api/incomeItems';
import type { TransactionKind } from '@/types/database';
import { getMonthName } from '@/utils/dateUtils';

// Привязка операции к бюджету одним значением:
// '' — вне бюджета, 'i:<id>' — из дохода, 'm:<id>' — месяц без дохода
export type BudgetValue = string;

export interface BudgetGroup {
  monthId: string;
  label: string;
  incomes: IncomeChoice[];
}

export const incomeValue = (id: string) => `i:${id}`;
export const monthValue = (id: string) => `m:${id}`;

export const budgetValueOf = (t: {
  budget_month_id?: string | null;
  income_item_id?: string | null;
}): BudgetValue =>
  t.income_item_id
    ? incomeValue(t.income_item_id)
    : t.budget_month_id
    ? monthValue(t.budget_month_id)
    : '';

const daysBetween = (a: string, b: string) =>
  Math.abs(new Date(a).getTime() - new Date(b).getTime()) / 86_400_000;

// Последний по дате; при равенстве — с более поздней плановой датой
const latestBy = (items: IncomeChoice[], date: (i: IncomeChoice) => string | null) =>
  [...items].sort(
    (a, b) =>
      (date(b) ?? '').localeCompare(date(a) ?? '') ||
      (b.planned_date ?? '').localeCompare(a.planned_date ?? '')
  )[0];

// Доходы по месяцам бюджета и правило, из какого дохода по умолчанию идёт операция.
// Бюджет — не календарь: пока следующий доход не поступил,
// траты идут из предыдущего, когда бы он ни пришёл
export function useBudgetChoices() {
  const { data: months = [] } = useGetBudgetMonthsQuery();
  const { data: incomes = [] } = useGetIncomeChoicesQuery();

  return useMemo(() => {
    const monthById = new Map(months.map((m) => [m.id, m]));
    const incomeById = new Map(incomes.map((i) => [i.id, i]));
    const monthLabel = (id: string) => {
      const m = monthById.get(id);
      return m ? m.name || `${getMonthName(m.month)} ${m.year}` : 'Архивный месяц';
    };

    // Месяцы уже отсортированы от новых к старым, архивные не приходят
    const groups: BudgetGroup[] = months.map((m) => ({
      monthId: m.id,
      label: monthLabel(m.id),
      incomes: incomes
        .filter((i) => i.budget_month_id === m.id)
        .sort((a, b) => (a.planned_date ?? '').localeCompare(b.planned_date ?? '')),
    }));
    const active = incomes.filter((i) => monthById.has(i.budget_month_id));

    const toFields = (value: BudgetValue) => {
      if (value.startsWith('i:')) {
        const income = incomeById.get(value.slice(2));
        return {
          budget_month_id: income?.budget_month_id ?? null,
          income_item_id: value.slice(2),
        };
      }
      if (value.startsWith('m:')) {
        return { budget_month_id: value.slice(2), income_item_id: null };
      }
      return { budget_month_id: null, income_item_id: null };
    };

    const labelOf = (value: BudgetValue) => {
      if (value.startsWith('i:')) return incomeById.get(value.slice(2))?.name ?? 'Доход';
      if (value.startsWith('m:')) return monthLabel(value.slice(2));
      return 'Вне бюджета';
    };

    // Месяц того же номера, что и дата, — если доходов в нём ещё не завели
    const calendarMonth = (date: string) => {
      const [year, month] = date.split('-').map(Number);
      const m = months.find((x) => x.year === year && x.month === month);
      return m ? monthValue(m.id) : '';
    };

    const defaultFor = ({
      kind,
      accountId,
      date,
    }: {
      kind: TransactionKind;
      accountId?: string;
      date: string;
    }): BudgetValue => {
      if (kind === 'adjustment') return '';

      // Поступление — к ещё не полученному доходу с ближайшей плановой датой
      if (kind === 'income') {
        const expected = active
          .filter((i) => !i.received_date && i.planned_date)
          .sort(
            (a, b) =>
              daysBetween(a.planned_date!, date) - daysBetween(b.planned_date!, date)
          )[0];
        return expected ? incomeValue(expected.id) : calendarMonth(date);
      }

      // Трата — из последнего дохода, поступившего к дате операции;
      // если на этот счёт что-то поступало — из последнего такого
      const received = active.filter((i) => i.received_date && i.received_date <= date);
      const sameAccount = received.filter((i) => i.received_account_id === accountId);
      const income =
        latestBy(sameAccount.length ? sameAccount : received, (i) => i.received_date) ??
        latestBy(
          active.filter((i) => i.planned_date && i.planned_date <= date),
          (i) => i.planned_date
        );
      return income ? incomeValue(income.id) : calendarMonth(date);
    };

    // Счёт, на который пришёл доход, — трата из него по умолчанию с той же карты
    const accountOf = (value: BudgetValue) =>
      value.startsWith('i:')
        ? incomeById.get(value.slice(2))?.received_account_id ?? null
        : null;

    return { groups, toFields, labelOf, defaultFor, accountOf };
  }, [months, incomes]);
}
