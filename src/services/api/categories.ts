import { supabase } from '@/services/supabase';
import type { ExpenseCategory } from '@/types/database';
import { toApiError, type Builder } from './types';

export type CategoryInput = Pick<
  ExpenseCategory,
  'name' | 'icon' | 'type' | 'color' | 'sort_order'
>;

export const categoriesEndpoints = (builder: Builder) => ({
  // Все категории, включая архивные — они нужны для отображения старых операций
  getExpenseCategories: builder.query<ExpenseCategory[], void>({
    async queryFn() {
      const { data, error } = await supabase
        .from('expense_categories')
        .select('*')
        .order('sort_order', { ascending: true });

      if (error) return toApiError(error);
      return { data: data || [] };
    },
    providesTags: ['ExpenseCategories'],
  }),

  createExpenseCategory: builder.mutation<ExpenseCategory, CategoryInput>({
    async queryFn(category) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return { error: { message: 'User not authenticated' } };

      const { data, error } = await supabase
        .from('expense_categories')
        .insert({ ...category, user_id: user.id, is_system: false })
        .select()
        .single();

      if (error) return toApiError(error);
      return { data };
    },
    invalidatesTags: ['ExpenseCategories'],
  }),

  updateExpenseCategory: builder.mutation<
    ExpenseCategory,
    Partial<CategoryInput> & { id: string; is_archived?: boolean }
  >({
    async queryFn({ id, ...updates }) {
      const { data, error } = await supabase
        .from('expense_categories')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) return toApiError(error);
      return { data };
    },
    invalidatesTags: ['ExpenseCategories'],
  }),

  // БД не даст удалить категорию, у которой есть операции или планы
  deleteExpenseCategory: builder.mutation<void, string>({
    async queryFn(id) {
      const { error } = await supabase
        .from('expense_categories')
        .delete()
        .eq('id', id);

      if (error) return toApiError(error);
      return { data: undefined };
    },
    invalidatesTags: ['ExpenseCategories'],
  }),
});
