import type { MonthKey, SpendingRow } from '@/services/api/analytics';
import { getMonthName } from '@/utils/dateUtils';
import { formatMoney } from '@/utils/ledger';
import {
  keyOf,
  OTHER,
  percentChange,
  periodMonths,
  shortLabel,
  type Labeler,
  type SeriesInfo,
} from './analyticsModel';
import styles from './AnalyticsPage.module.scss';

interface Props {
  month: MonthKey;
  months: MonthKey[]; // месяцы, которые можно выбрать
  onMonthChange: (month: MonthKey) => void;
  spending: SpendingRow[];
  labeler: Labeler;
  series: SeriesInfo[];
}

const sumByCategory = (rows: SpendingRow[], keys: Set<string>, labeler: Labeler) => {
  const totals = new Map<string, number>();
  for (const r of rows) {
    if (!keys.has(keyOf(r))) continue;
    const key = labeler.keyOf(r);
    totals.set(key, (totals.get(key) ?? 0) + r.amount);
  }
  return totals;
};

const changeText = (current: number, base: number, label: string) => {
  const change = percentChange(current, base);
  if (change === null) return null;
  const sign = change > 0 ? '+' : change < 0 ? '−' : '';
  return `${sign}${Math.abs(Math.round(change))}% к ${label}`;
};

// Траты выбранного месяца по категориям: сравнение с прошлым месяцем
// и со средним за три предыдущих
export const CategoryBreakdown = ({
  month,
  months,
  onMonthChange,
  spending,
  labeler,
  series,
}: Props) => {
  const [prev] = periodMonths(month, 2);
  const prevThree = periodMonths(month, 4).slice(0, 3);

  const current = sumByCategory(spending, new Set([keyOf(month)]), labeler);
  const previous = sumByCategory(spending, new Set([keyOf(prev)]), labeler);
  const threeMonths = sumByCategory(spending, new Set(prevThree.map(keyOf)), labeler);

  const total = [...current.values()].reduce((s, v) => s + v, 0);
  const prevTotal = [...previous.values()].reduce((s, v) => s + v, 0);
  const avgTotal = [...threeMonths.values()].reduce((s, v) => s + v, 0) / 3;

  const colorOf = new Map(series.map((s) => [s.key, s.color]));
  const rows = [...current.entries()].sort((a, b) => b[1] - a[1]);
  const max = rows[0]?.[1] ?? 0;

  return (
    <section className={styles.card}>
      <div className={styles.cardHeader}>
        <div>
          <h2 className={styles.cardTitle}>Траты по категориям</h2>
          <span className={styles.cardHint}>Только расходы, без переводов в копилки</span>
        </div>
        <select
          className={styles.monthSelect}
          value={keyOf(month)}
          onChange={(e) => {
            const [year, m] = e.target.value.split('-').map(Number);
            onMonthChange({ year, month: m });
          }}
          aria-label="Месяц"
        >
          {months.map((m) => (
            <option key={keyOf(m)} value={keyOf(m)}>
              {getMonthName(m.month)} {m.year}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.hero}>
        <span className={styles.heroValue}>{formatMoney(total)}</span>
        <span className={styles.heroMeta}>
          {[
            changeText(total, prevTotal, shortLabel(prev)),
            avgTotal > 0 ? `в среднем за 3 мес. ${formatMoney(Math.round(avgTotal))}` : null,
          ]
            .filter(Boolean)
            .join(' · ') || 'Не с чем сравнить'}
        </span>
      </div>

      {rows.length === 0 ? (
        <div className={styles.empty}>В этом месяце трат нет</div>
      ) : (
        <ul className={styles.list}>
          {rows.map(([key, amount]) => {
            const label = labeler.labelOf(key);
            // Цвет — у строк из топа; остальные серые, как «Другое» на графике
            const color = colorOf.get(key) ?? colorOf.get(OTHER) ?? 'var(--series-other)';
            const avg = (threeMonths.get(key) ?? 0) / 3;
            const meta = [
              total > 0 ? `${Math.round((amount / total) * 100)}% трат` : null,
              changeText(amount, previous.get(key) ?? 0, shortLabel(prev)),
              avg > 0 ? `ср. ${formatMoney(Math.round(avg))}` : null,
            ].filter(Boolean);
            return (
              <li key={key} className={styles.row}>
                <div className={styles.rowLine}>
                  <span className={styles.rowName}>
                    <span className={styles.swatch} style={{ background: color }} />
                    <span>
                      {label.icon} {label.name}
                    </span>
                  </span>
                  <span className={styles.rowAmount}>{formatMoney(amount)}</span>
                </div>
                <div className={styles.bar}>
                  <span
                    className={styles.barFill}
                    style={{ width: `${(amount / max) * 100}%`, background: color }}
                  />
                </div>
                <span className={styles.rowMeta}>{meta.join(' · ')}</span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
};
