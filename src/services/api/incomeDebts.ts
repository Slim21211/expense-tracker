import { supabase } from '@/services/supabase';
import type { Builder } from './types';

export const incomeDebtsEndpoints = (builder: Builder) => ({
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

      const { data: piggyBank } = await supabase
        .from('piggy_banks')
        .select('current_amount')
        .eq('id', data.piggy_bank_id)
        .single();

      if (piggyBank) {
        await Promise.all([
          supabase.from('piggy_bank_transactions').insert({
            user_id: user.id,
            piggy_bank_id: data.piggy_bank_id,
            type: 'expense',
            amount: data.amount,
            description: data.description || 'Взятие в долг для дохода',
            transaction_date: new Date().toISOString().split('T')[0],
          }),
          supabase
            .from('piggy_banks')
            .update({
              current_amount: piggyBank.current_amount - data.amount,
            })
            .eq('id', data.piggy_bank_id),
        ]);
      }

      return { data: result };
    },
    invalidatesTags: ['BudgetMonths', 'PiggyBanks', 'IncomeDebts'],
  }),

  getIncomeDebts: builder.query<any[], string>({
    async queryFn(incomeItemId) {
      const { data, error } = await supabase
        .from('income_debts')
        .select('*, piggy_bank:piggy_banks(*)')
        .eq('income_item_id', incomeItemId);

      if (error) return { error };
      return { data: data || [] };
    },
    providesTags: (_result, _error, id) => [{ type: 'IncomeDebts', id }],
  }),
});
