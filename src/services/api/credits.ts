import { supabase } from '@/services/supabase';
import type { Builder } from './types';

export const creditsEndpoints = (builder: Builder) => ({
  getCredits: builder.query<any[], void>({
    async queryFn() {
      const { data, error } = await supabase
        .from('credits')
        .select('*')
        .eq('is_archived', false)
        .order('created_at', { ascending: true });

      if (error) return { error };
      return { data: data || [] };
    },
    providesTags: ['Credits'],
  }),

  createCredit: builder.mutation<any, Omit<any, 'id' | 'user_id' | 'created_at' | 'updated_at'>>({
    async queryFn(newCredit) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return { error: { message: 'User not authenticated' } };

      const { data, error } = await supabase
        .from('credits')
        .insert({ ...newCredit, user_id: user.id })
        .select()
        .single();

      if (error) return { error };

      await supabase.from('expense_categories').insert({
        user_id: user.id,
        name: newCredit.name,
        icon: newCredit.icon,
        type: 'variable',
        color: newCredit.color,
        is_system: false,
        sort_order: 1000,
      });

      return { data };
    },
    invalidatesTags: ['Credits', 'ExpenseCategories'],
  }),

  updateCredit: builder.mutation<any, Partial<any> & { id: string }>({
    async queryFn({ id, ...updates }) {
      const { data, error } = await supabase
        .from('credits')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) return { error };
      return { data };
    },
    invalidatesTags: ['Credits'],
  }),

  deleteCredit: builder.mutation<void, string>({
    async queryFn(id) {
      const { error } = await supabase
        .from('credits')
        .update({ is_archived: true })
        .eq('id', id);

      if (error) return { error };
      return { data: undefined };
    },
    invalidatesTags: ['Credits'],
  }),
});
