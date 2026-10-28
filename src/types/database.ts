// Типы таблиц БД. Деньги живут только в transactions,
// балансы и итоги — вычисляемые представления.

export interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

// regular — карты/наличные (бюджет месяца), savings — копилки, credit — кредиты
export type AccountKind = 'regular' | 'savings' | 'credit';

export interface Account {
  id: string;
  user_id: string;
  name: string;
  kind: AccountKind;
  icon: string;
  color: string;
  target_amount: number | null; // цель копилки / сумма кредита
  sort_order: number;
  is_archived: boolean;
  track_balance: boolean; // false — деньги вне учёта: баланс не показывается и не суммируется
  created_at: string;
  updated_at: string;
}

export interface AccountWithBalance extends Account {
  balance: number;
}

export type TransactionKind = 'income' | 'expense' | 'transfer' | 'adjustment';

export interface Transaction {
  id: string;
  user_id: string;
  kind: TransactionKind;
  amount: number;
  from_account_id: string | null;
  to_account_id: string | null;
  category_id: string | null;
  budget_month_id: string | null;
  income_item_id: string | null;
  date: string; // YYYY-MM-DD
  description: string | null;
  legacy_source: string | null;
  created_at: string;
  updated_at: string;
}

export type TransactionDraft = Pick<
  Transaction,
  | 'kind'
  | 'amount'
  | 'from_account_id'
  | 'to_account_id'
  | 'category_id'
  | 'budget_month_id'
  | 'income_item_id'
  | 'date'
  | 'description'
>;

export interface BudgetMonth {
  id: string;
  user_id: string;
  month: number;
  year: number;
  name: string | null;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface BudgetMonthTotals {
  planned_income: number;
  planned_expenses: number;
  actual_income: number;
  actual_expenses: number;
  carry_over: number; // остаток всех предыдущих месяцев
  remaining: number; // carry_over + actual_income - actual_expenses
}

export type BudgetMonthWithTotals = BudgetMonth & BudgetMonthTotals;

export type ExpenseCategoryType = 'variable' | 'fixed';

export interface ExpenseCategory {
  id: string;
  user_id: string | null;
  name: string;
  type: ExpenseCategoryType;
  icon: string;
  color: string;
  is_system: boolean;
  is_archived: boolean;
  sort_order: number;
  created_at: string;
}

// План дохода. Факт считается по транзакциям с income_item_id
export interface IncomeItem {
  id: string;
  user_id: string;
  budget_month_id: string;
  name: string;
  planned_amount: number;
  planned_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// План расхода: на категорию или на перевод в копилку/кредит
export interface ExpenseItem {
  id: string;
  user_id: string;
  budget_month_id: string;
  income_item_id: string | null;
  category_id: string | null;
  target_account_id: string | null;
  planned_amount: number;
  created_at: string;
  updated_at: string;
}

export interface BudgetMonthDetails {
  month: BudgetMonth;
  income_items: IncomeItem[];
  expense_items: ExpenseItem[];
  transactions: Transaction[];
}
