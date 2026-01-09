import { createApi, fakeBaseQuery } from '@reduxjs/toolkit/query/react';
import { supabase } from '@/services/supabase';
import type {
  PiggyBank,
  BudgetMonth,
  ExpenseCategory,
  IncomeItem,
  ExpenseItem,
  BudgetMonthWithData,
  ExpenseItemWithCategory,
  PiggyBankTransaction,
} from '@/types/database';

export const api = createApi({
  reducerPath: 'api',
  baseQuery: fakeBaseQuery(),
  tagTypes: [
    'PiggyBanks',
    'BudgetMonths',
    'ExpenseCategories',
    'IncomeItems',
    'ExpenseItems',
    'PiggyBankTransactions',
    'ExpenseTransactions',
    'IncomeDebts',
  ],
  endpoints: (builder) => ({
    // Piggy Banks
    getPiggyBanks: builder.query<PiggyBank[], void>({
      async queryFn() {
        const { data, error } = await supabase
          .from('piggy_banks')
          .select('*')
          .eq('is_archived', false)
          .order('created_at', { ascending: true });

        if (error) return { error };
        return { data: data || [] };
      },
      providesTags: ['PiggyBanks'],
    }),

    createPiggyBank: builder.mutation<
      PiggyBank,
      Omit<PiggyBank, 'id' | 'user_id' | 'created_at' | 'updated_at'>
    >({
      async queryFn(newPiggyBank) {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return { error: { message: 'User not authenticated' } };

        // Создаём копилку
        const { data, error } = await supabase
          .from('piggy_banks')
          .insert({ ...newPiggyBank, user_id: user.id })
          .select()
          .single();

        if (error) return { error };

        // Создаём категорию с названием копилки
        await supabase.from('expense_categories').insert({
          user_id: user.id,
          name: newPiggyBank.name,
          icon: newPiggyBank.icon,
          type: 'variable',
          color: newPiggyBank.color,
          is_system: false,
          sort_order: 1000, // В конец списка
        });

        return { data };
      },
      invalidatesTags: ['PiggyBanks', 'ExpenseCategories'],
    }),

    updatePiggyBank: builder.mutation<
      PiggyBank,
      Partial<PiggyBank> & { id: string }
    >({
      async queryFn({ id, ...updates }) {
        const { data, error } = await supabase
          .from('piggy_banks')
          .update(updates)
          .eq('id', id)
          .select()
          .single();

        if (error) return { error };
        return { data };
      },
      invalidatesTags: ['PiggyBanks'],
    }),

    deletePiggyBank: builder.mutation<void, string>({
      async queryFn(id) {
        const { error } = await supabase
          .from('piggy_banks')
          .update({ is_archived: true })
          .eq('id', id);

        if (error) return { error };
        return { data: undefined };
      },
      invalidatesTags: ['PiggyBanks'],
    }),

    // Budget Months
    getBudgetMonths: builder.query<BudgetMonthWithData[], void>({
      async queryFn() {
        // Получаем все месяцы
        const { data: months, error: monthsError } = await supabase
          .from('budget_months')
          .select('*')
          .eq('is_archived', false)
          .order('year', { ascending: false })
          .order('month', { ascending: false });

        if (monthsError) return { error: monthsError };
        if (!months || months.length === 0) return { data: [] };

        // Для каждого месяца получаем доходы и транзакции расходов
        const monthsWithData = await Promise.all(
          months.map(async (month) => {
            const [
              { data: incomeItems },
              { data: expenseTransactions },
            ] = await Promise.all([
              supabase
                .from('income_items')
                .select('planned_amount, actual_amount')
                .eq('budget_month_id', month.id),
              supabase
                .from('expense_transactions')
                .select('amount')
                .eq('budget_month_id', month.id),
            ]);

            const totalPlannedIncome =
              incomeItems?.reduce((sum, item) => sum + item.planned_amount, 0) || 0;
            const totalActualIncome =
              incomeItems?.reduce((sum, item) => sum + (item.actual_amount || 0), 0) || 0;
            const totalActualExpenses =
              expenseTransactions?.reduce((sum, t) => sum + (t.amount || 0), 0) || 0;

            return {
              ...month,
              total_planned_income: totalPlannedIncome,
              total_actual_income: totalActualIncome,
              total_actual_expenses: totalActualExpenses,
              balance: totalActualIncome - totalActualExpenses,
            };
          })
        );

        return { data: monthsWithData };
      },
      providesTags: ['BudgetMonths'],
    }),

    getBudgetMonthById: builder.query<BudgetMonthWithData, string>({
      async queryFn(id) {
        // Параллельные запросы вместо последовательных
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

        // Группируем транзакции по income_item_id
        const transactionsByIncome: Record<string, any[]> = {};
        (expenseTransactions || []).forEach((t) => {
          if (!transactionsByIncome[t.income_item_id]) {
            transactionsByIncome[t.income_item_id] = [];
          }
          transactionsByIncome[t.income_item_id].push(t);
        });

        // Добавляем транзакции к каждому income_item
        const incomeItemsWithTransactions = (incomeItems || []).map(
          (income) => ({
            ...income,
            expense_transactions: transactionsByIncome[income.id] || [],
          })
        );

        // Calculate totals
        const totalPlannedIncome =
          incomeItemsWithTransactions.reduce(
            (sum, item) => sum + item.planned_amount,
            0
          ) || 0;
        const totalActualIncome =
          incomeItemsWithTransactions.reduce(
            (sum, item) => sum + (item.actual_amount || 0),
            0
          ) || 0;
        const totalPlannedExpenses =
          (expenseItems || []).reduce(
            (sum, item) => sum + item.planned_amount,
            0
          ) || 0;

        // Считаем фактические расходы из всех транзакций
        const totalActualExpenses =
          (expenseTransactions || []).reduce(
            (sum, t) => sum + (t.amount || 0),
            0
          ) || 0;

        return {
          data: {
            ...month,
            income_items: incomeItemsWithTransactions,
            expense_items: (expenseItems || []) as ExpenseItemWithCategory[],
            total_planned_income: totalPlannedIncome,
            total_actual_income: totalActualIncome,
            total_planned_expenses: totalPlannedExpenses,
            total_actual_expenses: totalActualExpenses,
            balance: totalActualIncome - totalActualExpenses,
          },
        };
      },
      providesTags: (_result, _error, id) => [{ type: 'BudgetMonths', id }],
    }),

    createBudgetMonth: builder.mutation<
      BudgetMonth,
      { month: number; year: number; name?: string }
    >({
      async queryFn(newMonth) {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return { error: { message: 'User not authenticated' } };

        const { data, error } = await supabase
          .from('budget_months')
          .insert({ ...newMonth, user_id: user.id })
          .select()
          .single();

        if (error) return { error };
        return { data };
      },
      invalidatesTags: ['BudgetMonths'],
    }),

    // Expense Categories
    getExpenseCategories: builder.query<ExpenseCategory[], void>({
      async queryFn() {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        const { data, error } = await supabase
          .from('expense_categories')
          .select('*')
          .or(`is_system.eq.true,user_id.eq.${user?.id}`)
          .order('sort_order', { ascending: true });

        if (error) return { error };
        return { data: data || [] };
      },
      providesTags: ['ExpenseCategories'],
    }),

    createExpenseCategory: builder.mutation<
      ExpenseCategory,
      Omit<ExpenseCategory, 'id' | 'user_id' | 'created_at' | 'is_system'>
    >({
      async queryFn(newCategory) {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return { error: { message: 'User not authenticated' } };

        const { data, error } = await supabase
          .from('expense_categories')
          .insert({ ...newCategory, user_id: user.id, is_system: false })
          .select()
          .single();

        if (error) return { error };
        return { data };
      },
      invalidatesTags: ['ExpenseCategories'],
    }),

    deleteExpenseCategory: builder.mutation<void, string>({
      async queryFn(id) {
        const { error } = await supabase
          .from('expense_categories')
          .delete()
          .eq('id', id);

        if (error) return { error };
        return { data: undefined };
      },
      invalidatesTags: ['ExpenseCategories'],
    }),

    // Income Items
    createIncomeItem: builder.mutation<
      IncomeItem,
      Omit<IncomeItem, 'id' | 'user_id' | 'created_at' | 'updated_at'>
    >({
      async queryFn(newIncome) {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return { error: { message: 'User not authenticated' } };

        const { data, error } = await supabase
          .from('income_items')
          .insert({ ...newIncome, user_id: user.id })
          .select()
          .single();

        if (error) return { error };
        return { data };
      },
      invalidatesTags: (_result, _error, arg) => [
        'IncomeItems',
        { type: 'BudgetMonths', id: arg.budget_month_id },
      ],
    }),

    updateIncomeItem: builder.mutation<
      IncomeItem,
      Partial<IncomeItem> & { id: string }
    >({
      async queryFn({ id, ...updates }) {
        const { data, error } = await supabase
          .from('income_items')
          .update(updates)
          .eq('id', id)
          .select()
          .single();

        if (error) return { error };
        return { data };
      },
      invalidatesTags: (result) => [
        'IncomeItems',
        { type: 'BudgetMonths', id: result?.budget_month_id },
      ],
    }),

    deleteIncomeItem: builder.mutation<void, string>({
      async queryFn(id) {
        const { error } = await supabase
          .from('income_items')
          .delete()
          .eq('id', id);

        if (error) return { error };
        return { data: undefined };
      },
      invalidatesTags: ['IncomeItems', 'BudgetMonths'],
    }),

    // Expense Items
    createExpenseItem: builder.mutation<
      ExpenseItem,
      Omit<ExpenseItem, 'id' | 'user_id' | 'created_at' | 'updated_at'>
    >({
      async queryFn(newExpense) {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return { error: { message: 'User not authenticated' } };

        const { data, error } = await supabase
          .from('expense_items')
          .insert({ ...newExpense, user_id: user.id })
          .select()
          .single();

        if (error) return { error };
        return { data };
      },
      invalidatesTags: (_result, _error, arg) => [
        'ExpenseItems',
        { type: 'BudgetMonths', id: arg.budget_month_id },
      ],
    }),

    updateExpenseItem: builder.mutation<
      ExpenseItem,
      Partial<ExpenseItem> & { id: string }
    >({
      async queryFn({ id, ...updates }) {
        const { data, error } = await supabase
          .from('expense_items')
          .update(updates)
          .eq('id', id)
          .select()
          .single();

        if (error) return { error };
        return { data };
      },
      invalidatesTags: (result) => [
        'ExpenseItems',
        { type: 'BudgetMonths', id: result?.budget_month_id },
      ],
    }),

    deleteExpenseItem: builder.mutation<void, string>({
      async queryFn(id) {
        const { error } = await supabase
          .from('expense_items')
          .delete()
          .eq('id', id);

        if (error) return { error };
        return { data: undefined };
      },
      invalidatesTags: ['ExpenseItems', 'BudgetMonths'],
    }),

    // Piggy Bank Transactions
    createPiggyBankTransaction: builder.mutation<
      PiggyBankTransaction,
      Omit<PiggyBankTransaction, 'id' | 'user_id' | 'created_at'>
    >({
      async queryFn(newTransaction) {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return { error: { message: 'User not authenticated' } };

        const { data, error } = await supabase
          .from('piggy_bank_transactions')
          .insert({ ...newTransaction, user_id: user.id })
          .select()
          .single();

        if (error) return { error };
        return { data: data as PiggyBankTransaction };
      },
      invalidatesTags: ['PiggyBanks', 'PiggyBankTransactions'],
    }),

    getPiggyBankTransactions: builder.query<PiggyBankTransaction[], string>({
      async queryFn(piggyBankId) {
        const { data, error } = await supabase
          .from('piggy_bank_transactions')
          .select('*')
          .eq('piggy_bank_id', piggyBankId)
          .order('transaction_date', { ascending: false });

        if (error) return { error };
        return { data: data || [] };
      },
      providesTags: (_result, _error, id) => [
        { type: 'PiggyBankTransactions', id },
      ],
    }),

    // Expense Transactions (фактические расходы)
    createExpenseTransaction: builder.mutation<
      any,
      {
        income_item_id: string;
        category_id: string;
        amount: number;
        description?: string;
      }
    >({
      async queryFn(data) {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return { error: { message: 'User not authenticated' } };

        // Сначала получаем budget_month_id из income_item
        const { data: incomeItem, error: incomeError } = await supabase
          .from('income_items')
          .select('budget_month_id')
          .eq('id', data.income_item_id)
          .single();

        if (incomeError) return { error: incomeError };
        if (!incomeItem) return { error: { message: 'Income item not found' } };

        const { data: result, error } = await supabase
          .from('expense_transactions')
          .insert({
            user_id: user.id,
            budget_month_id: incomeItem.budget_month_id,
            income_item_id: data.income_item_id,
            category_id: data.category_id,
            amount: data.amount,
            description: data.description || null,
            transaction_date: new Date().toISOString().split('T')[0],
          })
          .select()
          .single();

        if (error) return { error };
        return { data: result };
      },
      invalidatesTags: ['BudgetMonths', 'IncomeItems', 'ExpenseTransactions'],
    }),

    getExpenseTransactions: builder.query<any[], string>({
      async queryFn(incomeItemId) {
        const { data, error } = await supabase
          .from('expense_transactions')
          .select('*, category:expense_categories(*)')
          .eq('income_item_id', incomeItemId)
          .order('transaction_date', { ascending: false });

        if (error) return { error };
        return { data: data || [] };
      },
      providesTags: (_result, _error, id) => [
        { type: 'ExpenseTransactions', id },
        'ExpenseTransactions',
      ],
    }),

    // Income Debts (взятие в долг из копилок)
    createIncomeDebt: builder.mutation<
      any,
      {
        income_item_id: string;
        piggy_bank_id: string;
        amount: number;
        description?: string;
      }
    >({
      async queryFn(data) {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return { error: { message: 'User not authenticated' } };

        const { data: result, error } = await supabase
          .from('income_debts')
          .insert({
            user_id: user.id,
            income_item_id: data.income_item_id,
            piggy_bank_id: data.piggy_bank_id,
            amount: data.amount,
            description: data.description || null,
          })
          .select()
          .single();

        if (error) return { error };
        return { data: result };
      },
      invalidatesTags: [
        'BudgetMonths',
        'IncomeItems',
        'PiggyBanks',
        'PiggyBankTransactions',
      ],
    }),

    getIncomeDebts: builder.query<any[], string>({
      async queryFn(incomeItemId) {
        const { data, error } = await supabase
          .from('income_debts')
          .select('*, piggy_bank:piggy_banks(*)')
          .eq('income_item_id', incomeItemId)
          .order('created_at', { ascending: false });

        if (error) return { error };
        return { data: data || [] };
      },
      providesTags: (_result, _error, id) => [{ type: 'IncomeItems', id }],
    }),

    // Add actual income (плюсование к фактическому доходу)
    addActualIncome: builder.mutation<
      any,
      { income_item_id: string; amount: number }
    >({
      async queryFn(data) {
        // Сначала получаем текущую сумму
        const { data: current, error: fetchError } = await supabase
          .from('income_items')
          .select('actual_amount')
          .eq('id', data.income_item_id)
          .single();

        if (fetchError) return { error: fetchError };

        // Плюсуем к существующей
        const newAmount = (current?.actual_amount || 0) + data.amount;

        const { data: result, error: updateError } = await supabase
          .from('income_items')
          .update({
            actual_amount: newAmount,
            actual_date: new Date().toISOString().split('T')[0],
          })
          .eq('id', data.income_item_id)
          .select()
          .single();

        if (updateError) return { error: updateError };
        return { data: result };
      },
      invalidatesTags: ['BudgetMonths', 'IncomeItems'],
    }),

    // Create income with expense plans
    createIncomeWithPlans: builder.mutation<
      any,
      {
        budget_month_id: string;
        name: string;
        planned_amount: number;
        planned_date?: string;
        expense_plans: Array<{ category_id: string; planned_amount: number }>;
      }
    >({
      async queryFn(data) {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return { error: { message: 'User not authenticated' } };

        // Создаем доход
        const { data: income, error: incomeError } = await supabase
          .from('income_items')
          .insert({
            user_id: user.id,
            budget_month_id: data.budget_month_id,
            name: data.name,
            planned_amount: data.planned_amount,
            planned_date: data.planned_date || null,
            actual_amount: null,
            actual_date: null,
            notes: null,
          })
          .select()
          .single();

        if (incomeError) return { error: incomeError };

        // Создаем планы расходов
        if (data.expense_plans.length > 0) {
          const expensePlans = data.expense_plans.map((plan) => ({
            user_id: user.id,
            budget_month_id: data.budget_month_id,
            category_id: plan.category_id,
            name: income.id, // Связь с доходом
            planned_amount: plan.planned_amount,
            actual_amount: null,
            transaction_date: null,
            notes: null,
            is_from_bank: false,
            bank_transaction_id: null,
          }));

          const { error: plansError } = await supabase
            .from('expense_items')
            .insert(expensePlans);

          if (plansError) return { error: plansError };
        }

        return { data: income };
      },
      invalidatesTags: ['BudgetMonths', 'IncomeItems', 'ExpenseItems'],
    }),
  }),
});

export const {
  useGetPiggyBanksQuery,
  useCreatePiggyBankMutation,
  useUpdatePiggyBankMutation,
  useDeletePiggyBankMutation,
  useGetBudgetMonthsQuery,
  useGetBudgetMonthByIdQuery,
  useCreateBudgetMonthMutation,
  useGetExpenseCategoriesQuery,
  useCreateExpenseCategoryMutation,
  useDeleteExpenseCategoryMutation,
  useCreateIncomeItemMutation,
  useUpdateIncomeItemMutation,
  useDeleteIncomeItemMutation,
  useCreateExpenseItemMutation,
  useUpdateExpenseItemMutation,
  useDeleteExpenseItemMutation,
  useCreatePiggyBankTransactionMutation,
  useGetPiggyBankTransactionsQuery,
  useCreateExpenseTransactionMutation,
  useGetExpenseTransactionsQuery,
  useCreateIncomeDebtMutation,
  useGetIncomeDebtsQuery,
  useAddActualIncomeMutation,
  useCreateIncomeWithPlansMutation,
} = api;
