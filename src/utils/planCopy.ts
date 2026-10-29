// Помощники для копирования плана дохода в другой месяц

const MONTHS = [
  'январь', 'февраль', 'март', 'апрель', 'май', 'июнь',
  'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь',
];

const MONTH_RE = new RegExp(`(?<![а-яё])(${MONTHS.join('|')})(?![а-яё])`, 'giu');

// Разница в месяцах между двумя месяцами бюджета
export function monthDelta(
  from: { month: number; year: number },
  to: { month: number; year: number }
): number {
  return (to.year - from.year) * 12 + (to.month - from.month);
}

// «Аванс октябрь» + 1 → «Аванс ноябрь»; регистр первой буквы сохраняется
export function shiftMonthNames(name: string, delta: number): string {
  if (delta === 0) return name;
  return name.replace(MONTH_RE, (word) => {
    const index = MONTHS.indexOf(word.toLowerCase());
    const shifted = MONTHS[(((index + delta) % 12) + 12) % 12];
    return word[0] === word[0].toUpperCase()
      ? shifted[0].toUpperCase() + shifted.slice(1)
      : shifted;
  });
}

// '2026-10-31' + 1 месяц → '2026-11-30' (день ограничен длиной месяца)
export function shiftDate(date: string | null, delta: number): string | null {
  if (!date || delta === 0) return date;
  const [year, month, day] = date.slice(0, 10).split('-').map(Number);
  const target = new Date(year, month - 1 + delta, 1);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  const mm = String(target.getMonth() + 1).padStart(2, '0');
  const dd = String(Math.min(day, lastDay)).padStart(2, '0');
  return `${target.getFullYear()}-${mm}-${dd}`;
}

// Ближайший более ранний месяц из списка — источник для копирования плана
export function findPreviousMonth<T extends { month: number; year: number }>(
  months: T[],
  target: { month: number; year: number }
): T | undefined {
  return months
    .filter((m) => monthDelta(m, target) > 0)
    .sort((a, b) => monthDelta(a, b))[0];
}
