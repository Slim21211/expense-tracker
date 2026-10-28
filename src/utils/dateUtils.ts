// Даты в БД хранятся как YYYY-MM-DD без часового пояса.
// Разбираем вручную: new Date('2026-01-05') — это полночь UTC, а не местное время.
function parseDate(dateString: string): Date {
  const [year, month, day] = dateString.slice(0, 10).split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function formatDate(dateString: string | null): string {
  if (!dateString) return '';

  const date = parseDate(dateString);
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');

  return `${day}.${month}`;
}

export function formatFullDate(dateString: string | null): string {
  if (!dateString) return '';

  const date = parseDate(dateString);
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();

  return `${day}.${month}.${year}`;
}

// Сегодняшняя дата в местном времени (toISOString() дал бы дату по UTC)
export function todayISO(): string {
  const now = new Date();
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

export function getCurrentMonth(): { month: number; year: number } {
  const now = new Date();
  return {
    month: now.getMonth() + 1,
    year: now.getFullYear(),
  };
}

export function getMonthName(month: number): string {
  const months = [
    'Январь',
    'Февраль',
    'Март',
    'Апрель',
    'Май',
    'Июнь',
    'Июль',
    'Август',
    'Сентябрь',
    'Октябрь',
    'Ноябрь',
    'Декабрь',
  ];
  return months[month - 1] || '';
}
