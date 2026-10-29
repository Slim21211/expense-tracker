import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { AccountFlowRow, MonthKey } from '@/services/api/analytics';
import type { AccountWithBalance } from '@/types/database';
import { getMonthName } from '@/utils/dateUtils';
import { formatMoney } from '@/utils/ledger';
import { compactMoney, keyOf, niceTicks, shortLabel } from './analyticsModel';
import { ChartTooltip } from './ChartTooltip';
import styles from './AnalyticsPage.module.scss';

interface Props {
  period: MonthKey[];
  accountFlows: AccountFlowRow[];
  accounts: AccountWithBalance[];
}

type Point = Record<string, number | string> & { key: string; label: string };

const AXIS_TICK = { fill: 'var(--color-text-tertiary)', fontSize: 11 };
const MAX_SLOTS = 8;

// Баланс копилок на конец каждого месяца: накопленная сумма всех движений
export const SavingsGrowth = ({ period, accountFlows, accounts }: Props) => {
  const savings = accounts
    .filter((a) => a.kind === 'savings' && a.track_balance && !a.is_archived)
    .slice(0, MAX_SLOTS)
    .map((a, i) => ({ ...a, color: `var(--series-${i + 1})` }));
  const spansYears = period[0].year !== period[period.length - 1].year;

  const data: Point[] = period.map((m) => {
    const key = keyOf(m);
    const point: Point = { key, label: shortLabel(m, spansYears) };
    for (const a of savings) {
      // Ключи вида YYYY-MM сравниваются как строки
      point[a.id] = accountFlows
        .filter((f) => f.account_id === a.id && keyOf(f) <= key)
        .reduce((s, f) => s + f.delta, 0);
    }
    return point;
  });

  const totalOf = (p: Point) => savings.reduce((s, a) => s + (p[a.id] as number), 0);
  const first = data[0] ? totalOf(data[0]) : 0;
  const last = data[data.length - 1] ? totalOf(data[data.length - 1]) : 0;
  const change = last - first;
  const debt = savings.reduce((s, a) => s + Math.max(a.debt, 0), 0);
  const ticks = niceTicks(Math.max(...data.map(totalOf), 0));

  return (
    <section className={styles.card}>
      <div className={styles.cardHeader}>
        <div>
          <h2 className={styles.cardTitle}>Накопления</h2>
          <span className={styles.cardHint}>Баланс копилок на конец месяца</span>
        </div>
      </div>

      <div className={styles.hero}>
        <span className={styles.heroValue}>{formatMoney(last)}</span>
        <span className={styles.heroMeta}>
          {[
            `${change >= 0 ? '+' : '−'}${formatMoney(Math.abs(change))} за ${period.length} мес.`,
            debt > 0 ? `в долгу у копилок ${formatMoney(debt)}` : null,
          ]
            .filter(Boolean)
            .join(' · ')}
        </span>
      </div>

      {savings.length === 0 ? (
        <div className={styles.empty}>Копилок пока нет</div>
      ) : (
        <>
          <div className={styles.chart}>
            <ResponsiveContainer>
              <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
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
                  cursor={{ stroke: 'var(--color-text-tertiary)', strokeDasharray: '3 3' }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const point = payload[0].payload as Point;
                    const [year, month] = point.key.split('-').map(Number);
                    return (
                      <ChartTooltip
                        title={`${getMonthName(month)} ${year}`}
                        items={[...savings]
                          .reverse()
                          .map((a) => ({ name: a.name, color: a.color, value: point[a.id] as number }))}
                        total={{ label: 'Всего', value: totalOf(point) }}
                      />
                    );
                  }}
                />
                {savings.map((a) => (
                  <Area
                    key={a.id}
                    dataKey={a.id}
                    stackId="savings"
                    type="monotone"
                    stroke={a.color}
                    strokeWidth={2}
                    fill={a.color}
                    fillOpacity={0.25}
                    isAnimationActive={false}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className={styles.legend}>
            {savings.map((a) => (
              <span key={a.id} className={styles.legendItem}>
                <span className={styles.swatch} style={{ background: a.color }} />
                {a.name}
              </span>
            ))}
          </div>
        </>
      )}
    </section>
  );
};
