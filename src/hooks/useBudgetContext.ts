import { useMemo } from 'react';
import {
  useGetBudgetMonthByIdQuery,
  useGetBudgetMonthsQuery,
} from '@/services/api';
import { getCurrentMonth, todayISO } from '@/utils/dateUtils';

// Текущий месяц бюджета и доход, из которого сейчас, скорее всего, идут траты:
// тот, к которому привязана последняя операция месяца, иначе — последний
// по плановой дате, которая уже наступила.
export function useBudgetContext() {
  const { data: months = [] } = useGetBudgetMonthsQuery();
  const { month, year } = getCurrentMonth();
  const currentMonth =
    months.find((m) => m.month === month && m.year === year) ?? months[0];

  const { data: details } = useGetBudgetMonthByIdQuery(currentMonth?.id ?? '', {
    skip: !currentMonth,
  });

  const defaultIncomeId = useMemo(() => {
    if (!details) return null;
    const lastUsed = details.transactions.find((t) => t.income_item_id);
    if (lastUsed) return lastUsed.income_item_id;

    const today = todayISO();
    const started = details.income_items
      .filter((i) => i.planned_date && i.planned_date <= today)
      .sort((a, b) => (b.planned_date ?? '').localeCompare(a.planned_date ?? ''));
    return started[0]?.id ?? details.income_items[0]?.id ?? null;
  }, [details]);

  return {
    monthId: currentMonth?.id ?? null,
    incomeItems: details?.income_items ?? [],
    defaultIncomeId,
  };
}
