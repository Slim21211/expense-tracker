import { supabase } from '@/services/supabase';
import type { BudgetMonth, ExpenseItem, IncomeItem } from '@/types/database';
import { monthDelta, shiftDate, shiftMonthNames } from '@/utils/planCopy';
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

// Доход прошлого месяца с планом — основа для копирования
export type IncomePlanSource = IncomeItem & {
  month: Pick<BudgetMonth, 'month' | 'year' | 'name'>;
  plans: ExpenseItem[];
};

type PlanFields = Pick<ExpenseItem, 'category_id' | 'target_account_id' | 'planned_amount'>;

const planFields = (p: ExpenseItem): PlanFields => ({
  category_id: p.target_account_id ? null : p.category_id,
  target_account_id: p.target_account_id,
  planned_amount: Number(p.planned_amount),
});

export const incomeItemsEndpoints = (builder: Builder) => ({
  // Последние доходы с планами — для «Заполнить из…»
  getRecentIncomePlans: builder.query<IncomePlanSource[], void>({
    async queryFn() {
      const { data, error } = await supabase
        .from('income_items')
        .select('*, month:budget_months(month, year, name), plans:expense_items(*)')
        .order('created_at', { ascending: false })
        .limit(30);

      if (error) return toApiError(error);
      return {
        data: (data as IncomePlanSource[]).map((i) => ({
          ...i,
          planned_amount: Number(i.planned_amount),
        })),
      };
    },
    providesTags: ['BudgetMonths'],
  }),

  // Копирует все доходы и планы одного месяца в другой: названия месяцев
  // в именах доходов и плановые даты сдвигаются, фактические операции не копируются
  copyMonthPlans: builder.mutation<void, { sourceMonthId: string; targetMonthId: string }>({
    async queryFn({ sourceMonthId, targetMonthId }) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return { error: { message: 'User not authenticated' } };

      const [monthsResult, incomesResult, plansResult] = await Promise.all([
        supabase.from('budget_months').select('id, month, year').in('id', [sourceMonthId, targetMonthId]),
        supabase
          .from('income_items')
          .select('*')
          .eq('budget_month_id', sourceMonthId)
          .order('planned_date', { ascending: true, nullsFirst: false })
          .order('created_at', { ascending: true }),
        supabase.from('expense_items').select('*').eq('budget_month_id', sourceMonthId),
      ]);
      if (monthsResult.error) return toApiError(monthsResult.error);
      if (incomesResult.error) return toApiError(incomesResult.error);
      if (plansResult.error) return toApiError(plansResult.error);

      const source = monthsResult.data.find((m) => m.id === sourceMonthId);
      const target = monthsResult.data.find((m) => m.id === targetMonthId);
      if (!source || !target) return { error: { message: 'Месяц не найден' } };
      const delta = monthDelta(source, target);
      const plans = plansResult.data as ExpenseItem[];

      // По одному доходу, чтобы точно знать, какой новый id соответствует старому
      for (const income of incomesResult.data as IncomeItem[]) {
        const { data: created, error } = await supabase
          .from('income_items')
          .insert({
            user_id: user.id,
            budget_month_id: targetMonthId,
            name: shiftMonthNames(income.name, delta),
            planned_amount: income.planned_amount,
            planned_date: shiftDate(income.planned_date, delta),
          })
          .select('id')
          .single();
        if (error) return toApiError(error);

        const rows = plans
          .filter((p) => p.income_item_id === income.id)
          .map((p) => ({
            ...planFields(p),
            user_id: user.id,
            budget_month_id: targetMonthId,
            income_item_id: created.id,
          }));
        if (rows.length > 0) {
          const { error: plansError } = await supabase.from('expense_items').insert(rows);
          if (plansError) return toApiError(plansError);
        }
      }

      return { data: undefined };
    },
    invalidatesTags: ['BudgetMonths'],
  }),

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
