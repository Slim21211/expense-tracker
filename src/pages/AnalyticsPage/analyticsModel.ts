import type { MonthKey, SpendingRow } from '@/services/api/analytics';
import type { Account, ExpenseCategory } from '@/types/database';

// Категории в графиках: 7 самых затратных за период получают свой цвет,
// остальные складываются в «Другое» (больше цветов не различить)
export const MAX_SERIES = 7;
export const OTHER = 'other';
export const NO_CATEGORY = 'none';

const SHORT_MONTHS = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];

export const keyOf = (m: MonthKey) => `${m.year}-${String(m.month).padStart(2, '0')}`;

export const shortLabel = (m: MonthKey, withYear = false) =>
  withYear ? `${SHORT_MONTHS[m.month - 1]} ${String(m.year).slice(2)}` : SHORT_MONTHS[m.month - 1];

// Последние count месяцев, заканчивая end, по возрастанию
export function periodMonths(end: MonthKey, count: number): MonthKey[] {
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(end.year, end.month - 1 - (count - 1 - i), 1);
    return { year: d.getFullYear(), month: d.getMonth() + 1 };
  });
}

// Строка аналитики: категория трат, а для трат без категории из копилки —
// сама копилка («Отпуск» → траты на отпуск)
export interface Labeler {
  keyOf: (row: Pick<SpendingRow, 'category_id' | 'account_id'>) => string;
  labelOf: (key: string) => { name: string; icon: string };
}

export function makeLabeler(
  categories: ExpenseCategory[],
  accounts: Pick<Account, 'id' | 'name' | 'icon' | 'kind'>[]
): Labeler {
  const categoryById = new Map(categories.map((c) => [c.id, c]));
  const accountById = new Map(accounts.map((a) => [a.id, a]));
  return {
    keyOf: ({ category_id, account_id }) => {
      if (category_id) return category_id;
      const account = account_id ? accountById.get(account_id) : undefined;
      return account && account.kind !== 'regular' ? `acc:${account.id}` : NO_CATEGORY;
    },
    labelOf: (key) => {
      if (key.startsWith('acc:')) {
        const account = accountById.get(key.slice(4));
        return { name: account?.name ?? 'Копилка', icon: account?.icon ?? '' };
      }
      const category = categoryById.get(key);
      return { name: category?.name ?? 'Без категории', icon: category?.icon ?? '' };
    },
  };
}

export interface SeriesInfo {
  key: string; // ключ строки (см. Labeler) или OTHER
  name: string;
  icon: string;
  color: string; // CSS-переменная из палитры
}

// Цвет закреплён за строкой (по сумме за переданные месяцы), а не за её местом
// в конкретном месяце — одна категория одного цвета во всех графиках страницы
export function buildSeries(
  spending: SpendingRow[],
  monthKeys: Set<string>,
  labeler: Labeler
): { series: SeriesInfo[]; seriesKeyOf: (row: SpendingRow) => string } {
  const totals = new Map<string, number>();
  for (const row of spending) {
    if (!monthKeys.has(keyOf(row))) continue;
    const key = labeler.keyOf(row);
    totals.set(key, (totals.get(key) ?? 0) + row.amount);
  }
  const ranked = [...totals.entries()].sort((a, b) => b[1] - a[1]).map(([k]) => k);
  const top = ranked.slice(0, MAX_SERIES);
  const hasOther = ranked.length > MAX_SERIES;

  const series: SeriesInfo[] = top.map((key, i) => ({
    key,
    ...labeler.labelOf(key),
    color: `var(--series-${i + 1})`,
  }));
  if (hasOther) {
    series.push({ key: OTHER, name: 'Другое', icon: '', color: 'var(--series-other)' });
  }

  const topSet = new Set(top);
  return {
    series,
    seriesKeyOf: (row) => {
      const key = labeler.keyOf(row);
      return topSet.has(key) ? key : OTHER;
    },
  };
}

// «150 000» → «150к», «1 200 000» → «1,2м» — для осей графиков
export function compactMoney(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `${(value / 1_000_000).toLocaleString('ru-RU', { maximumFractionDigits: 1 })}м`;
  if (abs >= 1_000) return `${Math.round(value / 1_000)}к`;
  return String(Math.round(value));
}

// Изменение в процентах; null, если сравнивать не с чем
export function percentChange(current: number, base: number): number | null {
  if (!base) return null;
  return ((current - base) / base) * 100;
}

// Круглые деления оси: 0, 100к, 200к… вместо 0, 95к, 190к…
export function niceTicks(max: number, count = 4): number[] {
  if (max <= 0) return [0];
  const rough = max / count;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((s) => s >= rough) ?? rough;
  return Array.from({ length: Math.ceil(max / step) + 1 }, (_, i) => i * step);
}
