import type { Account, Transaction } from '@/types/database';

export function formatMoney(amount: number): string {
  return `${amount.toLocaleString('ru-RU', { maximumFractionDigits: 2 })} ₽`;
}

export function parseAmount(value: string): number {
  return parseFloat(value.replace(',', '.').replace(/\s/g, ''));
}

type AccountKinds = Map<string, Account['kind']>;

export function accountKinds(accounts: Account[]): AccountKinds {
  return new Map(accounts.map((a) => [a.id, a.kind]));
}

const isRegular = (kinds: AccountKinds, id: string | null) =>
  id !== null && kinds.get(id) === 'regular';

// Те же правила, что во view budget_month_totals:
// бюджет месяца — это деньги на regular-счетах.
export function budgetInflow(t: Transaction, kinds: AccountKinds): number {
  return isRegular(kinds, t.to_account_id) && !isRegular(kinds, t.from_account_id)
    ? t.amount
    : 0;
}

export function budgetOutflow(t: Transaction, kinds: AccountKinds): number {
  return isRegular(kinds, t.from_account_id) && !isRegular(kinds, t.to_account_id)
    ? t.amount
    : 0;
}

// Изменение баланса конкретного счёта от транзакции
export function accountDelta(t: Transaction, accountId: string): number {
  if (t.to_account_id === accountId) return t.amount;
  if (t.from_account_id === accountId) return -t.amount;
  return 0;
}

export function errorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error) {
    const message = String((error as { message: unknown }).message);
    if (message.includes('violates foreign key constraint')) {
      return 'Нельзя удалить: на эту запись ссылаются операции. Используйте архивирование.';
    }
    return message;
  }
  return 'Неизвестная ошибка';
}

// Число → строка для поля суммы (с запятой, как вводят с телефона)
export function amountToInput(amount: number | null | undefined): string {
  return amount ? String(amount).replace('.', ',') : '';
}
