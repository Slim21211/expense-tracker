import { supabase } from '@/services/supabase';
import type { BudgetMonth, BudgetMonthWithData } from '@/types/database';
import type { Builder } from './types';

export const budgetMonthsEndpoints = (builder: Builder) => ({
  getBudgetMonths: builder.query<BudgetMonthWithData[], void>({
    async queryFn() {
      const { data: months, error: monthsError } = await supabase
        .from('budget_months')
        .select('*')
        .eq('is_archived', false)
        .order('year', { ascending: false })
        .order('month', { ascending: false });

      if (monthsError) return { error: monthsError };
      if (!months || months.length === 0) return { data: [] };

      // ✅ Для каждого месяца загружаем данные
      const monthsWithData = await Promise.all(
        months.map(async (month) => {
          const [
            { data: incomeItems },
            { data: expenseItems },
            { data: expenseTransactions },
          ] = await Promise.all([
            supabase
              .from('income_items')
              .select('*')
              .eq('budget_month_id', month.id)
              .order('planned_date', { ascending: true }),
            supabase
              .from('expense_items')
              .select('*')
              .eq('budget_month_id', month.id),
            supabase
              .from('expense_transactions')
              .select('*')
              .eq('budget_month_id', month.id),
          ]);

          // ✅ Считаем доходы
          const totalPlannedIncome =
            incomeItems?.reduce((sum, item) => sum + item.planned_amount, 0) ||
            0;
          const totalActualIncome =
            incomeItems?.reduce(
              (sum, item) => sum + (item.actual_amount || 0),
              0
            ) || 0;

          // ✅ Считаем расходы
          const totalPlannedExpenses =
            expenseItems?.reduce((sum, item) => sum + item.planned_amount, 0) ||
            0;
          const totalActualExpenses =
            expenseTransactions?.reduce((sum, t) => sum + t.amount, 0) || 0;

          return {
            ...month,
            total_planned_income: totalPlannedIncome,
            total_actual_income: totalActualIncome,
            total_planned_expenses: totalPlannedExpenses,
            total_actual_expenses: totalActualExpenses,
            total_expenses: totalActualExpenses, // Для обратной совместимости
            balance: totalActualIncome - totalActualExpenses, // Для обратной совместимости
            remaining_budget: totalActualIncome - totalActualExpenses,
          };
        })
      );

      return { data: monthsWithData };
    },
    providesTags: ['BudgetMonths'],
  }),

  getBudgetMonthById: builder.query<BudgetMonthWithData, string>({
    async queryFn(id: string) {
      const [
        { data: month, error: monthError },
        { data: incomeItems, error: incomeError },
        { data: expenseItems, error: expenseError },
        { data: expenseTransactions, error: transactionsError },
      ] = await Promise.all([
        supabase.from('budget_months').select('*').eq('id', id).single(),
        supabase
          .from('income_items')
          .select('*')
          .eq('budget_month_id', id)
          .order('planned_date', { ascending: true }),
        supabase
          .from('expense_items')
          .select('*, category:expense_categories(*)')
          .eq('budget_month_id', id)
          .order('created_at', { ascending: true }),
        supabase
          .from('expense_transactions')
          .select('*, category:expense_categories(*)')
          .eq('budget_month_id', id)
          .order('transaction_date', { ascending: false }),
      ]);

      if (monthError) return { error: monthError };
      if (incomeError) return { error: incomeError };
      if (expenseError) return { error: expenseError };
      if (transactionsError) return { error: transactionsError };
      if (!month) return { error: { message: 'Month not found' } };

      const transactionsByIncome: Record<string, any[]> = {};
      (expenseTransactions || []).forEach((t) => {
        if (!transactionsByIncome[t.income_item_id]) {
          transactionsByIncome[t.income_item_id] = [];
        }
        transactionsByIncome[t.income_item_id].push(t);
      });

      const incomeItemsWithTransactions = (incomeItems || []).map((income) => ({
        ...income,
        expense_transactions: transactionsByIncome[income.id] || [],
      }));

      // ✅ Подсчёт доходов
      const totalPlannedIncome =
        incomeItems?.reduce((sum, item) => sum + item.planned_amount, 0) || 0;
      const totalActualIncome =
        incomeItems?.reduce(
          (sum, item) => sum + (item.actual_amount || 0),
          0
        ) || 0;

      // ✅ Подсчёт расходов
      const totalPlannedExpenses =
        expenseItems?.reduce((sum, item) => sum + item.planned_amount, 0) || 0;
      const totalActualExpenses =
        expenseTransactions?.reduce((sum, t) => sum + t.amount, 0) || 0;

      return {
        data: {
          ...month,
          income_items: incomeItemsWithTransactions,
          expense_items: expenseItems || [],
          expense_transactions: expenseTransactions || [],
          total_planned_income: totalPlannedIncome,
          total_actual_income: totalActualIncome,
          total_planned_expenses: totalPlannedExpenses,
          total_actual_expenses: totalActualExpenses,
          total_expenses: totalActualExpenses,
          balance: totalActualIncome - totalActualExpenses,
          remaining_budget: totalActualIncome - totalActualExpenses,
        },
      };
    },
    providesTags: (_result: any, _error: any, id: string) => [
      { type: 'BudgetMonths', id },
    ],
  }),

  createBudgetMonth: builder.mutation<
    BudgetMonth,
    Omit<BudgetMonth, 'id' | 'user_id' | 'created_at' | 'updated_at'>
  >({
    async queryFn(
      month: Omit<BudgetMonth, 'id' | 'user_id' | 'created_at' | 'updated_at'>
    ) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return { error: { message: 'User not authenticated' } };

      const { data, error } = await supabase
        .from('budget_months')
        .insert({ ...month, user_id: user.id })
        .select()
        .single();

      if (error) return { error };
      return { data };
    },
    invalidatesTags: ['BudgetMonths'],
  }),
});
