import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { MonthKey, MonthTotalsRow, SpendingRow } from '@/services/api/analytics';
import { getMonthName } from '@/utils/dateUtils';
import { formatMoney } from '@/utils/ledger';
import { compactMoney, keyOf, niceTicks, shortLabel, type SeriesInfo } from './analyticsModel';
import { ChartTooltip } from './ChartTooltip';
import styles from './AnalyticsPage.module.scss';

interface Props {
  period: MonthKey[];
  spending: SpendingRow[];
  totals: MonthTotalsRow[];
  series: SeriesInfo[];
  seriesKeyOf: (row: SpendingRow) => string;
}

type Point = Record<string, number | string> & { key: string; label: string; income: number };

const AXIS_TICK = { fill: 'var(--color-text-tertiary)', fontSize: 11 };

// Траты по месяцам, сложенные по категориям, и доход линией — на одной оси (оба в ₽)
export const SpendingTrend = ({ period, spending, totals, series, seriesKeyOf }: Props) => {
  const spansYears = period[0].year !== period[period.length - 1].year;
  const incomeByMonth = new Map(totals.map((t) => [keyOf(t), t.income]));

  const data: Point[] = period.map((m) => {
    const point: Point = {
      key: keyOf(m),
      label: shortLabel(m, spansYears),
      income: incomeByMonth.get(keyOf(m)) ?? 0,
    };
    for (const s of series) point[s.key] = 0;
    return point;
  });
  const byKey = new Map(data.map((p) => [p.key, p]));
  for (const row of spending) {
    const point = byKey.get(keyOf(row));
    if (!point) continue;
    const key = seriesKeyOf(row);
    point[key] = (point[key] as number) + row.amount;
  }

  const spentTotal = (p: Point) => series.reduce((s, x) => s + (p[x.key] as number), 0);
  const averageSpent = data.reduce((s, p) => s + spentTotal(p), 0) / data.length;
  const averageIncome = data.reduce((s, p) => s + p.income, 0) / data.length;
  const hasData = data.some((p) => spentTotal(p) > 0 || p.income > 0);
  const ticks = niceTicks(Math.max(...data.map((p) => Math.max(spentTotal(p), p.income))));

  return (
    <section className={styles.card}>
      <div className={styles.cardHeader}>
        <div>
          <h2 className={styles.cardTitle}>Траты и доход по месяцам</h2>
          <span className={styles.cardHint}>Месяц — месяц бюджета</span>
        </div>
      </div>

      <div className={styles.hero}>
        <span className={styles.heroValue}>{formatMoney(Math.round(averageSpent))}</span>
        <span className={styles.heroMeta}>
          тратится в среднем за месяц · доход в среднем {formatMoney(Math.round(averageIncome))}
        </span>
      </div>

      {!hasData ? (
        <div className={styles.empty}>За этот период данных нет</div>
      ) : (
        <>
          <div className={styles.chart}>
            <ResponsiveContainer>
              <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid vertical={false} stroke="var(--color-border-light)" />
                <XAxis dataKey="label" tick={AXIS_TICK} axisLine={false} tickLine={false} />
                <YAxis
                  tick={AXIS_TICK}
                  axisLine={false}
                  tickLine={false}
                  width={44}
                  ticks={ticks}
                  domain={[0, ticks[ticks.length - 1]]}
                  tickFormatter={compactMoney}
                />
                <Tooltip
                  cursor={{ fill: 'var(--color-primary-soft)' }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const point = payload[0].payload as Point;
                    const [year, month] = point.key.split('-').map(Number);
                    return (
                      <ChartTooltip
                        title={`${getMonthName(month)} ${year}`}
                        items={series
                          .filter((s) => (point[s.key] as number) > 0)
                          .map((s) => ({ name: s.name, color: s.color, value: point[s.key] as number }))
                          .reverse()}
                        total={{ label: 'Потрачено', value: spentTotal(point) }}
                        extra={{ label: 'Доход', value: point.income }}
                      />
                    );
                  }}
                />
                {series.map((s, i) => (
                  <Bar
                    key={s.key}
                    dataKey={s.key}
                    stackId="spent"
                    fill={s.color}
                    // Зазор между сегментами — цветом фона карточки
                    stroke="var(--color-surface-elevated)"
                    strokeWidth={1}
                    radius={i === series.length - 1 ? [4, 4, 0, 0] : 0}
                    maxBarSize={36}
                    isAnimationActive={false}
                  />
                ))}
                <Line
                  dataKey="income"
                  type="monotone"
                  stroke="var(--color-text-primary)"
                  strokeWidth={2}
                  strokeDasharray="5 4"
                  dot={{ r: 3, fill: 'var(--color-text-primary)', strokeWidth: 0 }}
                  activeDot={{ r: 5 }}
                  isAnimationActive={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          <div className={styles.legend}>
            {series.map((s) => (
              <span key={s.key} className={styles.legendItem}>
                <span className={styles.swatch} style={{ background: s.color }} />
                {s.name}
              </span>
            ))}
            <span className={styles.legendItem}>
              <span className={styles.legendLine} />
              Доход
            </span>
          </div>
        </>
      )}
    </section>
  );
};
