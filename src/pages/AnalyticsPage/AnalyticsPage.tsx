import { useMemo, useState } from 'react';
import {
  useGetAccountsQuery,
  useGetAnalyticsQuery,
  useGetExpenseCategoriesQuery,
} from '@/services/api';
import type { MonthKey } from '@/services/api/analytics';
import { getCurrentMonth } from '@/utils/dateUtils';
import { buildSeries, keyOf, periodMonths } from './analyticsModel';
import { CategoryBreakdown } from './CategoryBreakdown';
import { SpendingTrend } from './SpendingTrend';
import { PlanVsActual } from './PlanVsActual';
import { SavingsGrowth } from './SavingsGrowth';
import form from '@/styles/form.module.scss';
import styles from './AnalyticsPage.module.scss';

const PERIODS = [3, 6, 12];

export const AnalyticsPage = () => {
  const { data, isLoading, error } = useGetAnalyticsQuery();
  const { data: categories = [] } = useGetExpenseCategoriesQuery();
  const { data: accounts = [] } = useGetAccountsQuery();

  const { year, month } = getCurrentMonth();
  const [periodLength, setPeriodLength] = useState(6);
  const [selectedMonth, setSelectedMonth] = useState<MonthKey>({ year, month });

  const period = useMemo(
    () => periodMonths({ year, month }, periodLength),
    [periodLength, year, month]
  );
  // Месяц для разбивки по категориям — из последнего года, новые сверху
  const selectableMonths = useMemo(
    () => periodMonths({ year, month }, 12).reverse(),
    [year, month]
  );

  const { series, seriesKeyOf } = useMemo(
    () => buildSeries(data?.spending ?? [], new Set(period.map(keyOf)), categories),
    [data, period, categories]
  );

  if (isLoading) {
    return <div className={styles.loading}>Загрузка...</div>;
  }
  if (error || !data) {
    return <div className={styles.loading}>Не удалось загрузить аналитику</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Аналитика</h1>
        <div className={form.segmented} role="group" aria-label="Период">
          {PERIODS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriodLength(p)}
              className={`${form.segment} ${periodLength === p ? form.segmentActive : ''}`}
            >
              {p} мес.
            </button>
          ))}
        </div>
      </div>

      <CategoryBreakdown
        month={selectedMonth}
        months={selectableMonths}
        onMonthChange={setSelectedMonth}
        spending={data.spending}
        categories={categories}
        series={series}
        seriesKeyOf={seriesKeyOf}
      />
      <SpendingTrend
        period={period}
        spending={data.spending}
        totals={data.months}
        series={series}
        seriesKeyOf={seriesKeyOf}
      />
      <PlanVsActual
        period={period}
        spending={data.spending}
        plan={data.plan}
        categories={categories}
      />
      <SavingsGrowth period={period} accountFlows={data.accountFlows} accounts={accounts} />
    </div>
  );
};
