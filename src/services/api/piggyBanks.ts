import { supabase } from '@/services/supabase';
import type { PiggyBank, PiggyBankTransaction } from '@/types/database';
import type { Builder } from './types';

export const piggyBanksEndpoints = (builder: Builder) => ({
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
    async queryFn(newPiggyBank: Omit<PiggyBank, 'id' | 'user_id' | 'created_at' | 'updated_at'>) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return { error: { message: 'User not authenticated' } };

      const { data, error } = await supabase
        .from('piggy_banks')
        .insert({ ...newPiggyBank, user_id: user.id })
        .select()
        .single();

      if (error) return { error };

      await supabase.from('expense_categories').insert({
        user_id: user.id,
        name: newPiggyBank.name,
        icon: newPiggyBank.icon,
        type: 'variable',
        color: newPiggyBank.color,
        is_system: false,
        sort_order: 1000,
      });

      return { data };
    },
    invalidatesTags: ['PiggyBanks', 'ExpenseCategories'],
  }),

  updatePiggyBank: builder.mutation<
    PiggyBank,
    Partial<PiggyBank> & { id: string }
  >({
    async queryFn({ id, ...updates }: Partial<PiggyBank> & { id: string }) {
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
    async queryFn(id: string) {
      const { error } = await supabase
        .from('piggy_banks')
        .update({ is_archived: true })
        .eq('id', id);

      if (error) return { error };
      return { data: undefined };
    },
    invalidatesTags: ['PiggyBanks'],
  }),

  getPiggyBankTransactions: builder.query<PiggyBankTransaction[], string>({
    async queryFn(piggyBankId: string) {
      const { data, error } = await supabase
        .from('piggy_bank_transactions')
        .select('*')
        .eq('piggy_bank_id', piggyBankId)
        .order('transaction_date', { ascending: false });

      if (error) return { error };
      return { data: data || [] };
    },
    providesTags: (_result: any, _error: any, id: string) => [
      { type: 'PiggyBankTransactions', id },
    ],
  }),

  createPiggyBankTransaction: builder.mutation<
    PiggyBankTransaction,
    Omit<PiggyBankTransaction, 'id' | 'user_id' | 'created_at' | 'updated_at'>
  >({
    async queryFn(transaction: Omit<PiggyBankTransaction, 'id' | 'user_id' | 'created_at' | 'updated_at'>) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return { error: { message: 'User not authenticated' } };

      // ✅ ИСПРАВЛЕНИЕ БАГ #1: Только создаём транзакцию
      // Баланс обновится автоматически через триггер в БД
      const { data, error } = await supabase
        .from('piggy_bank_transactions')
        .insert({ ...transaction, user_id: user.id })
        .select()
        .single();

      if (error) return { error };

      // ❌ УБРАНО: Не обновляем баланс вручную!
      // Это делает триггер в БД

      return { data };
    },
    invalidatesTags: (_result: any, _error: any, arg: Omit<PiggyBankTransaction, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => [
      'PiggyBanks',
      { type: 'PiggyBankTransactions', id: arg.piggy_bank_id },
    ],
  }),
});
