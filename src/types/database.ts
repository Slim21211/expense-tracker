// Database types
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      user_profiles: {
        Row: UserProfile;
        Insert: Omit<UserProfile, 'created_at' | 'updated_at'>;
        Update: Partial<Omit<UserProfile, 'id' | 'created_at'>>;
      };
      piggy_banks: {
        Row: PiggyBank;
        Insert: Omit<PiggyBank, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<PiggyBank, 'id' | 'user_id' | 'created_at'>>;
      };
      piggy_bank_transactions: {
        Row: PiggyBankTransaction;
        Insert: Omit<PiggyBankTransaction, 'id' | 'created_at'>;
        Update: Partial<
          Omit<PiggyBankTransaction, 'id' | 'user_id' | 'created_at'>
        >;
      };
      budget_months: {
        Row: BudgetMonth;
        Insert: Omit<BudgetMonth, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<BudgetMonth, 'id' | 'user_id' | 'created_at'>>;
      };
      expense_categories: {
        Row: ExpenseCategory;
        Insert: Omit<ExpenseCategory, 'id' | 'created_at'>;
        Update: Partial<Omit<ExpenseCategory, 'id' | 'created_at'>>;
      };
      income_items: {
        Row: IncomeItem;
        Insert: Omit<IncomeItem, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<IncomeItem, 'id' | 'user_id' | 'created_at'>>;
      };
      expense_items: {
        Row: ExpenseItem;
        Insert: Omit<ExpenseItem, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<ExpenseItem, 'id' | 'user_id' | 'created_at'>>;
      };
      expense_transactions: {
        Row: ExpenseTransaction;
        Insert: Omit<ExpenseTransaction, 'id' | 'created_at'>;
        Update: Partial<
          Omit<ExpenseTransaction, 'id' | 'user_id' | 'created_at'>
        >;
      };
      income_debts: {
        Row: IncomeDebt;
        Insert: Omit<IncomeDebt, 'id' | 'created_at'>;
        Update: Partial<Omit<IncomeDebt, 'id' | 'user_id' | 'created_at'>>;
      };
    };
  };
}

export interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface PiggyBank {
  id: string;
  user_id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  color: string;
  icon: string;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

export type PiggyBankTransactionType =
  | 'expense'
  | 'debt'
  | 'deposit'
  | 'debt_repay';

export interface PiggyBankTransaction {
  id: string;
  user_id: string;
  piggy_bank_id: string;
  type: PiggyBankTransactionType;
  amount: number;
  description: string | null;
  transaction_date: string;
  created_at: string;
}

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

export type ExpenseCategoryType = 'constant' | 'variable';

export interface ExpenseCategory {
  id: string;
  user_id: string | null;
  name: string;
  type: ExpenseCategoryType;
  icon: string;
  color: string;
  is_system: boolean;
  sort_order: number;
  created_at: string;
}

export interface IncomeItem {
  id: string;
  user_id: string;
  budget_month_id: string;
  name: string;
  planned_amount: number;
  actual_amount: number | null;
  planned_date: string | null;
  actual_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// ExpenseItem используется для планов расходов
export interface ExpenseItem {
  id: string;
  user_id: string;
  budget_month_id: string;
  category_id: string;
  name: string | null; // Хранит income_item_id
  planned_amount: number;
  actual_amount: number | null;
  transaction_date: string | null;
  notes: string | null;
  is_from_bank: boolean;
  bank_transaction_id: string | null;
  created_at: string;
  updated_at: string;
}

// ExpenseTransaction для фактических трат (они суммируются)
export interface ExpenseTransaction {
  id: string;
  user_id: string;
  budget_month_id: string;
  income_item_id: string;
  category_id: string;
  amount: number;
  description: string | null;
  transaction_date: string;
  created_at: string;
}

// IncomeDebt для взятия в долг из копилок
export interface IncomeDebt {
  id: string;
  user_id: string;
  income_item_id: string;
  piggy_bank_id: string;
  amount: number;
  description: string | null;
  created_at: string;
}

export interface BankTransaction {
  id: string;
  user_id: string;
  bank_transaction_id: string;
  amount: number;
  currency: string;
  description: string | null;
  category: string | null;
  transaction_date: string;
  is_processed: boolean;
  linked_expense_id: string | null;
  raw_data: Json;
  created_at: string;
}

export interface BankIntegration {
  id: string;
  user_id: string;
  bank_name: string;
  access_token_encrypted: string | null;
  is_active: boolean;
  last_sync_at: string | null;
  sync_frequency: 'hourly' | 'daily' | 'manual';
  created_at: string;
  updated_at: string;
}

// Extended types
export interface ExpenseItemWithCategory extends ExpenseItem {
  category?: ExpenseCategory;
}

// ✅ ИСПРАВЛЕННЫЙ ИНТЕРФЕЙС
export interface BudgetMonthWithData extends BudgetMonth {
  income_items?: IncomeItemWithPlansAndTransactions[];
  expense_items?: ExpenseItemWithCategory[];
  expense_transactions?: ExpenseTransactionWithCategory[];
  total_planned_income?: number;
  total_actual_income?: number;
  total_planned_expenses?: number;
  total_actual_expenses?: number;
  total_expenses?: number; // Для обратной совместимости
  balance?: number; // Для обратной совместимости (устаревшее)
  remaining_budget?: number; // ← ДОБАВЛЕНО
}

export interface IncomeItemWithPlansAndTransactions extends IncomeItem {
  expense_plans?: ExpenseItemWithCategory[];
  expense_transactions?: ExpenseTransactionWithCategory[];
  income_debts?: IncomeDebtWithPiggyBank[];
}

export interface ExpenseTransactionWithCategory extends ExpenseTransaction {
  category?: ExpenseCategory;
}

export interface IncomeDebtWithPiggyBank extends IncomeDebt {
  piggy_bank?: PiggyBank;
}

export interface Credit {
  id: string;
  user_id: string;
  name: string;
  bank_name: string;
  total_amount: number;
  paid_amount: number;
  interest_rate: number;
  monthly_payment: number;
  start_date: string;
  end_date: string;
  color: string;
  icon: string;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}
