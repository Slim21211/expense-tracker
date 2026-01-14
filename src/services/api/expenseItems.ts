import { supabase } from '@/services/supabase';
import type { ExpenseItem } from '@/types/database';
import type { Builder } from './types';

export const expenseItemsEndpoints = (builder: Builder) => ({
  createExpenseItem: builder.mutation<
    ExpenseItem,
    Omit<ExpenseItem, 'id' | 'user_id' | 'created_at' | 'updated_at'>
  >({
    async queryFn(item: Omit<ExpenseItem, 'id' | 'user_id' | 'created_at' | 'updated_at'>) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return { error: { message: 'User not authenticated' } };

      const { data, error } = await supabase
        .from('expense_items')
        .insert({ ...item, user_id: user.id })
        .select()
        .single();

      if (error) return { error };
      return { data };
    },
    invalidatesTags: (result: any) =>
      result
        ? [{ type: 'BudgetMonths', id: result.budget_month_id }]
        : [],
  }),

  updateExpenseItem: builder.mutation<
    ExpenseItem,
    Partial<ExpenseItem> & { id: string; budget_month_id?: string }
  >({
    async queryFn({ id, budget_month_id, ...updates }: Partial<ExpenseItem> & { id: string; budget_month_id?: string }) {
      const { data, error } = await supabase
        .from('expense_items')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) return { error };
      return { data };
    },
    invalidatesTags: (_result: any, _error: any, arg: Partial<ExpenseItem> & { id: string; budget_month_id?: string }) =>
      arg.budget_month_id
        ? [{ type: 'BudgetMonths', id: arg.budget_month_id }]
        : [],
  }),

  deleteExpenseItem: builder.mutation<void, { id: string; budget_month_id?: string }>({
    async queryFn({ id }: { id: string; budget_month_id?: string }) {
      // ✅ Получаем expense_item чтобы узнать к какому income_item он относится
      const { data: expenseItem } = await supabase
        .from('expense_items')
        .select('name, category_id')
        .eq('id', id)
        .single();

      // Если expense_item.name содержит ID дохода, удаляем связанные транзакции
      if (expenseItem && expenseItem.name) {
        // name содержит income_item_id
        const incomeItemId = expenseItem.name;
        
        // Удаляем транзакции с этой категорией и этим доходом
        const { error: transactionsError } = await supabase
          .from('expense_transactions')
          .delete()
          .eq('income_item_id', incomeItemId)
          .eq('category_id', expenseItem.category_id);

        if (transactionsError) {
          console.error('Error deleting transactions:', transactionsError);
        }
      }

      // Теперь удаляем сам expense_item
      const { error } = await supabase
        .from('expense_items')
        .delete()
        .eq('id', id);

      if (error) return { error };
      return { data: undefined };
    },
    invalidatesTags: (_result: any, _error: any, arg: { id: string; budget_month_id?: string }) =>
      arg.budget_month_id
        ? [{ type: 'BudgetMonths', id: arg.budget_month_id }]
        : [],
  }),
});
