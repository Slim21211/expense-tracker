import type { MonthKey, PlanRow, SpendingRow } from '@/services/api/analytics';
import type { ExpenseCategory } from '@/types/database';
import { formatMoney } from '@/utils/ledger';
import { categoryKey, keyOf } from './analyticsModel';
import styles from './AnalyticsPage.module.scss';

interface Props {
  period: MonthKey[];
  spending: SpendingRow[];
  plan: PlanRow[];
  categories: ExpenseCategory[];
}

interface Row {
  key: string;
  planned: number;
  actual: number;
}

// План и факт по категориям за период: сравниваются только месяцы, где был план,
// чтобы месяцы без бюджета не выглядели как сплошная «экономия»
export const PlanVsActual = ({ period, spending, plan, categories }: Props) => {
  const periodKeys = new Set(period.map(keyOf));
  const plannedMonths = new Set(plan.filter((p) => periodKeys.has(keyOf(p))).map(keyOf));

  const rows = new Map<string, Row>();
  const row = (key: string) => {
    let r = rows.get(key);
    if (!r) {
      r = { key, planned: 0, actual: 0 };
      rows.set(key, r);
    }
    return r;
  };
  for (const p of plan) {
    if (plannedMonths.has(keyOf(p))) row(p.category_id).planned += p.planned;
  }
  for (const s of spending) {
    if (plannedMonths.has(keyOf(s))) row(categoryKey(s.category_id)).actual += s.amount;
  }

  // Сначала самые большие перерасходы
  const sorted = [...rows.values()].sort(
    (a, b) => b.actual - b.planned - (a.actual - a.planned)
  );
  const totalPlanned = sorted.reduce((s, r) => s + r.planned, 0);
  const totalActual = sorted.reduce((s, r) => s + r.actual, 0);
  const byId = new Map(categories.map((c) => [c.id, c]));
  const diff = totalActual - totalPlanned;

  return (
    <section className={styles.card}>
      <div className={styles.cardHeader}>
        <div>
          <h2 className={styles.cardTitle}>План и факт</h2>
          <span className={styles.cardHint}>
            {plannedMonths.size > 0
              ? `За ${plannedMonths.size} мес. с планом в выбранном периоде`
              : 'В выбранном периоде нет месяцев с планом'}
          </span>
        </div>
      </div>

      {plannedMonths.size > 0 && (
        <>
          <div className={styles.hero}>
            <span className={`${styles.heroValue} ${diff > 0 ? styles.negative : ''}`}>
              {diff > 0 ? 'Перерасход ' : 'Экономия '}
              {formatMoney(Math.abs(diff))}
            </span>
            <span className={styles.heroMeta}>
              потрачено {formatMoney(totalActual)} при плане {formatMoney(totalPlanned)}
            </span>
          </div>

          <ul className={styles.list}>
            {sorted.map((r) => {
              const category = byId.get(r.key);
              const over = r.actual > r.planned;
              const percent = r.planned > 0 ? Math.min((r.actual / r.planned) * 100, 100) : 100;
              return (
                <li key={r.key} className={styles.row}>
                  <div className={styles.rowLine}>
                    <span className={styles.rowName}>
                      <span>
                        {category?.icon} {category?.name ?? 'Без категории'}
                      </span>
                    </span>
                    <span className={styles.rowAmount}>{formatMoney(r.actual)}</span>
                  </div>
                  <div className={styles.bar}>
                    <span
                      className={styles.barFill}
                      style={{
                        width: `${r.actual > 0 ? percent : 0}%`,
                        // Вне плана — нейтрально: это не перерасход, плана просто не было
                        background:
                          r.planned === 0
                            ? 'var(--series-other)'
                            : over
                            ? 'var(--color-error)'
                            : 'var(--color-primary)',
                      }}
                    />
                  </div>
                  <div className={styles.rowLine}>
                    <span className={styles.rowMeta}>
                      {r.planned > 0 ? `план ${formatMoney(r.planned)}` : 'вне плана'}
                    </span>
                    {r.planned > 0 && (
                      <span className={`${styles.rowMeta} ${over ? styles.negative : ''}`}>
                        {over
                          ? `сверх плана ${formatMoney(r.actual - r.planned)}`
                          : r.actual === r.planned
                          ? 'точно по плану'
                          : `экономия ${formatMoney(r.planned - r.actual)}`}
                      </span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </section>
  );
};
