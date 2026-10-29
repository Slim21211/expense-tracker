import { formatMoney } from '@/utils/ledger';
import styles from './AnalyticsPage.module.scss';

export interface TooltipItem {
  name: string;
  color: string;
  value: number;
}

interface Props {
  title: string;
  items: TooltipItem[];
  total?: { label: string; value: number };
  extra?: { label: string; value: number };
}

// Подсказка графика: значения — цветом текста, цвет серии — только у маркера
export const ChartTooltip = ({ title, items, total, extra }: Props) => (
  <div className={styles.tooltip}>
    <div className={styles.tooltipTitle}>{title}</div>
    {items.map((item) => (
      <div key={item.name} className={styles.tooltipRow}>
        <span>
          <span className={styles.swatch} style={{ background: item.color }} />
          {item.name}
        </span>
        <span>{formatMoney(item.value)}</span>
      </div>
    ))}
    {total && (
      <div className={`${styles.tooltipRow} ${styles.tooltipTotal}`}>
        <span>{total.label}</span>
        <span>{formatMoney(total.value)}</span>
      </div>
    )}
    {extra && (
      <div className={styles.tooltipRow}>
        <span>{extra.label}</span>
        <span>{formatMoney(extra.value)}</span>
      </div>
    )}
  </div>
);
