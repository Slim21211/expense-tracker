import { supabase } from '@/services/supabase';
import type { IncomeItem } from '@/types/database';
import type { Builder } from './types';

export const incomeItemsEndpoints = (builder: Builder) => ({
  createIncomeItem: builder.mutation<
    IncomeItem,
    Omit<IncomeItem, 'id' | 'user_id' | 'created_at' | 'updated_at'>
  >({
    async queryFn(item: Omit<IncomeItem, 'id' | 'user_id' | 'created_at' | 'updated_at'>) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return { error: { message: 'User not authenticated' } };

      const { data, error } = await supabase
        .from('income_items')
        .insert({ ...item, user_id: user.id })
        .select()
        .single();

      if (error) return { error };
      return { data };
    },
    invalidatesTags: (result: any) =>
      result
        ? [{ type: 'BudgetMonths', id: result.budget_month_id }]
        : ['BudgetMonths'],
  }),

  updateIncomeItem: builder.mutation<
    IncomeItem,
    Partial<IncomeItem> & { id: string }
  >({
    async queryFn({ id, ...updates }: Partial<IncomeItem> & { id: string }) {
      const { data, error } = await supabase
        .from('income_items')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) return { error };
      return { data };
    },
    invalidatesTags: (result: any) =>
      result
        ? [{ type: 'BudgetMonths', id: result.budget_month_id }]
        : ['BudgetMonths'],
  }),

  deleteIncomeItem: builder.mutation<void, string>({
    async queryFn(id: string) {
      const { error } = await supabase
        .from('income_items')
        .delete()
        .eq('id', id);

      if (error) return { error };
      return { data: undefined };
    },
    invalidatesTags: ['BudgetMonths'],
  }),

  addActualIncome: builder.mutation<
    IncomeItem,
    { id: string; actual_amount: number; actual_date: string }
  >({
    async queryFn({ id, actual_amount, actual_date }: { id: string; actual_amount: number; actual_date: string }) {
      const { data, error } = await supabase
        .from('income_items')
        .update({ actual_amount, actual_date })
        .eq('id', id)
        .select()
        .single();

      if (error) return { error };
      return { data };
    },
    invalidatesTags: (result: any) =>
      result
        ? [{ type: 'BudgetMonths', id: result.budget_month_id }]
        : ['BudgetMonths'],
  }),

  createIncomeWithPlans: builder.mutation<
    any,
    {
      budget_month_id: string;
      name: string;
      planned_amount: number;
      planned_date: string | null;
      expense_plans: Array<{ category_id: string; planned_amount: number }>;
    }
  >({
    async queryFn(data: {
      budget_month_id: string;
      name: string;
      planned_amount: number;
      planned_date: string | null;
      expense_plans: Array<{ category_id: string; planned_amount: number }>;
    }) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return { error: { message: 'User not authenticated' } };

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

      if (data.expense_plans.length > 0) {
        const expensePlans = data.expense_plans.map((plan) => ({
          user_id: user.id,
          budget_month_id: data.budget_month_id,
          category_id: plan.category_id,
          name: income.id,
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
    invalidatesTags: (result: any) =>
      result
        ? [{ type: 'BudgetMonths', id: result.budget_month_id }]
        : ['BudgetMonths'],
  }),
});
