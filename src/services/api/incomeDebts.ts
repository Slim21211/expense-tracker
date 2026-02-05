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

  deleteIncomeDebt: builder.mutation<void, string>({
    async queryFn(id: string) {
      // ✅ НОВОЕ: Получаем долг перед удалением
      const { data: debt, error: fetchError } = await supabase
        .from('income_debts')
        .select('amount, income_item_id, piggy_bank_id')
        .eq('id', id)
        .single();

      if (fetchError) return { error: fetchError };
      if (!debt) return { error: { message: 'Debt not found' } };

      // ✅ Удаляем запись
      const { error: deleteError } = await supabase
        .from('income_debts')
        .delete()
        .eq('id', id);

      if (deleteError) return { error: deleteError };

      // ✅ ОТКАТЫВАЕМ изменения вручную
      // (если не хочешь добавлять SQL миграцию с триггером DELETE)
      const [piggyBankResult, incomeResult] = await Promise.all([
        // Получаем текущий баланс копилки
        supabase
          .from('piggy_banks')
          .select('current_amount')
          .eq('id', debt.piggy_bank_id)
          .single(),
        // Получаем текущий actual_amount дохода
        supabase
          .from('income_items')
          .select('actual_amount')
          .eq('id', debt.income_item_id)
          .single(),
      ]);

      if (piggyBankResult.data && incomeResult.data) {
        await Promise.all([
          // Возвращаем в копилку
          supabase
            .from('piggy_banks')
            .update({
              current_amount: piggyBankResult.data.current_amount + debt.amount,
            })
            .eq('id', debt.piggy_bank_id),
          // Вычитаем из дохода
          supabase
            .from('income_items')
            .update({
              actual_amount:
                (incomeResult.data.actual_amount || 0) - debt.amount,
            })
            .eq('id', debt.income_item_id),
        ]);
      }

      return { data: undefined };
    },
    invalidatesTags: ['BudgetMonths', 'PiggyBanks', 'IncomeDebts'],
  }),
});
