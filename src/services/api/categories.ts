import { supabase } from '@/services/supabase';
import type { ExpenseCategory } from '@/types/database';
import type { Builder } from './types';

export const categoriesEndpoints = (builder: Builder) => ({
  getExpenseCategories: builder.query<ExpenseCategory[], void>({
    async queryFn() {
      const { data, error } = await supabase
        .from('expense_categories')
        .select('*')
        .order('sort_order', { ascending: true });

      if (error) return { error };
      return { data: data || [] };
    },
    providesTags: ['ExpenseCategories'],
  }),

  createExpenseCategory: builder.mutation<
    ExpenseCategory,
    Omit<ExpenseCategory, 'id' | 'user_id' | 'created_at' | 'updated_at'>
  >({
    async queryFn(category) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return { error: { message: 'User not authenticated' } };

      const { data, error } = await supabase
        .from('expense_categories')
        .insert({ ...category, user_id: user.id })
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
});
