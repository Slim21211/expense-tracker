import { supabase } from '@/services/supabase';
import type { ExpenseItem, IncomeItem } from '@/types/database';
import { toApiError, type Builder } from './types';

export type PlanInput = Pick<
  ExpenseItem,
  'category_id' | 'target_account_id' | 'planned_amount'
> & { id?: string };

export interface SaveIncomePlanInput {
  income: Pick<
    IncomeItem,
    'budget_month_id' | 'name' | 'planned_amount' | 'planned_date'
  > & { id?: string };
  plans: PlanInput[];
  removedPlanIds: string[];
}

export const incomeItemsEndpoints = (builder: Builder) => ({
  // Доход и его планы расходов сохраняются вместе, по кнопке «Сохранить».
  // Планы не содержат денег, поэтому удаление плана не трогает транзакции.
  saveIncomePlan: builder.mutation<IncomeItem, SaveIncomePlanInput>({
    async queryFn({ income, plans, removedPlanIds }) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return { error: { message: 'User not authenticated' } };

      const { id, ...incomeFields } = income;
      const incomeResult = id
        ? await supabase
            .from('income_items')
            .update(incomeFields)
            .eq('id', id)
            .select()
            .single()
        : await supabase
            .from('income_items')
            .insert({ ...incomeFields, user_id: user.id })
            .select()
            .single();

      if (incomeResult.error) return toApiError(incomeResult.error);
      const savedIncome = incomeResult.data as IncomeItem;

      if (removedPlanIds.length > 0) {
        const { error } = await supabase
          .from('expense_items')
          .delete()
          .in('id', removedPlanIds);
        if (error) return toApiError(error);
      }

      for (const { id: planId, ...plan } of plans) {
        const { error } = planId
          ? await supabase.from('expense_items').update(plan).eq('id', planId)
          : await supabase.from('expense_items').insert({
              ...plan,
              user_id: user.id,
              budget_month_id: savedIncome.budget_month_id,
              income_item_id: savedIncome.id,
            });
        if (error) return toApiError(error);
      }

      return { data: savedIncome };
    },
    invalidatesTags: ['BudgetMonths'],
  }),

  // Удаляется только доход без операций: БД не даст удалить доход,
  // к которому привязаны транзакции
  deleteIncomeItem: builder.mutation<void, string>({
    async queryFn(id) {
      const { error } = await supabase.from('income_items').delete().eq('id', id);

      if (error) return toApiError(error);
      return { data: undefined };
    },
    invalidatesTags: ['BudgetMonths'],
  }),
});
