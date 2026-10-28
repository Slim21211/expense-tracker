import { supabase } from '@/services/supabase';
import type {
  BudgetMonth,
  BudgetMonthDetails,
  BudgetMonthWithTotals,
  ExpenseItem,
  IncomeItem,
  Transaction,
} from '@/types/database';
import { normalizeTransaction } from './transactions';
import { toApiError, type Builder } from './types';

interface TotalsRow {
  budget_month_id: string;
  planned_income: number;
  planned_expenses: number;
  actual_income: number;
  actual_expenses: number;
}

export const budgetMonthsEndpoints = (builder: Builder) => ({
  // Месяцы с итогами, от новых к старым.
  // carry_over — сумма остатков всех более ранних месяцев.
  getBudgetMonths: builder.query<BudgetMonthWithTotals[], void>({
    async queryFn() {
      const [monthsResult, totalsResult] = await Promise.all([
        supabase
          .from('budget_months')
          .select('*')
          .eq('is_archived', false)
          .order('year', { ascending: true })
          .order('month', { ascending: true }),
        supabase.from('budget_month_totals').select('*'),
      ]);

      if (monthsResult.error) return toApiError(monthsResult.error);
      if (totalsResult.error) return toApiError(totalsResult.error);

      const totals = new Map<string, TotalsRow>(
        (totalsResult.data as TotalsRow[]).map((t) => [t.budget_month_id, t])
      );

      let carryOver = 0;
      const months = (monthsResult.data as BudgetMonth[]).map((month) => {
        const t = totals.get(month.id);
        const actualIncome = Number(t?.actual_income ?? 0);
        const actualExpenses = Number(t?.actual_expenses ?? 0);
        const remaining = carryOver + actualIncome - actualExpenses;
        const result: BudgetMonthWithTotals = {
          ...month,
          planned_income: Number(t?.planned_income ?? 0),
          planned_expenses: Number(t?.planned_expenses ?? 0),
          actual_income: actualIncome,
          actual_expenses: actualExpenses,
          carry_over: carryOver,
          remaining,
        };
        carryOver = remaining;
        return result;
      });

      return { data: months.reverse() };
    },
    providesTags: ['BudgetMonths'],
  }),

  getBudgetMonthById: builder.query<BudgetMonthDetails, string>({
    async queryFn(id) {
      const [monthResult, incomeResult, plansResult, transactionsResult] =
        await Promise.all([
          supabase.from('budget_months').select('*').eq('id', id).single(),
          supabase
            .from('income_items')
            .select('*')
            .eq('budget_month_id', id)
            .order('planned_date', { ascending: true, nullsFirst: false })
            .order('created_at', { ascending: true }),
          supabase
            .from('expense_items')
            .select('*')
            .eq('budget_month_id', id)
            .order('created_at', { ascending: true }),
          supabase
            .from('transactions')
            .select('*')
            .eq('budget_month_id', id)
            .order('date', { ascending: false })
            .order('created_at', { ascending: false }),
        ]);

      if (monthResult.error) return toApiError(monthResult.error);
      if (incomeResult.error) return toApiError(incomeResult.error);
      if (plansResult.error) return toApiError(plansResult.error);
      if (transactionsResult.error) return toApiError(transactionsResult.error);

      return {
        data: {
          month: monthResult.data as BudgetMonth,
          income_items: (incomeResult.data as IncomeItem[]).map((i) => ({
            ...i,
            planned_amount: Number(i.planned_amount),
          })),
          expense_items: (plansResult.data as ExpenseItem[]).map((p) => ({
            ...p,
            planned_amount: Number(p.planned_amount),
          })),
          transactions: (transactionsResult.data as Transaction[]).map(
            normalizeTransaction
          ),
        },
      };
    },
    providesTags: ['BudgetMonths', 'Transactions'],
  }),

  createBudgetMonth: builder.mutation<
    BudgetMonth,
    Pick<BudgetMonth, 'month' | 'year' | 'name'>
  >({
    async queryFn(month) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return { error: { message: 'User not authenticated' } };

      const { data, error } = await supabase
        .from('budget_months')
        .insert({ ...month, user_id: user.id, is_archived: false })
        .select()
        .single();

      if (error) return toApiError(error);
      return { data };
    },
    invalidatesTags: ['BudgetMonths'],
  }),
});
