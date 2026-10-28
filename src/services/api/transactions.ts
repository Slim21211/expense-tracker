import { supabase } from '@/services/supabase';
import type { Transaction, TransactionDraft } from '@/types/database';
import { MONEY_TAGS, toApiError, type Builder } from './types';

// Значение budget_month_id для операций, не привязанных к месяцу
export const OUTSIDE_BUDGET = 'none';

export interface TransactionsFilter {
  account_id?: string;
  budget_month_id?: string; // id месяца или OUTSIDE_BUDGET
  limit: number;
}

export const normalizeTransaction = (t: Transaction): Transaction => ({
  ...t,
  amount: Number(t.amount),
});

export const transactionsEndpoints = (builder: Builder) => ({
  getTransactions: builder.query<Transaction[], TransactionsFilter>({
    async queryFn({ account_id, budget_month_id, limit }) {
      let query = supabase
        .from('transactions')
        .select('*')
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(limit);

      if (account_id) {
        query = query.or(
          `from_account_id.eq.${account_id},to_account_id.eq.${account_id}`
        );
      }
      if (budget_month_id === OUTSIDE_BUDGET) {
        query = query.is('budget_month_id', null);
      } else if (budget_month_id) {
        query = query.eq('budget_month_id', budget_month_id);
      }

      const { data, error } = await query;
      if (error) return toApiError(error);
      return { data: (data as Transaction[]).map(normalizeTransaction) };
    },
    providesTags: ['Transactions'],
  }),

  createTransaction: builder.mutation<Transaction, TransactionDraft>({
    async queryFn(draft) {
      const { data, error } = await supabase
        .from('transactions')
        .insert(draft)
        .select()
        .single();

      if (error) return toApiError(error);
      return { data: normalizeTransaction(data) };
    },
    invalidatesTags: MONEY_TAGS,
  }),

  updateTransaction: builder.mutation<
    Transaction,
    TransactionDraft & { id: string }
  >({
    async queryFn({ id, ...draft }) {
      const { data, error } = await supabase
        .from('transactions')
        .update(draft)
        .eq('id', id)
        .select()
        .single();

      if (error) return toApiError(error);
      return { data: normalizeTransaction(data) };
    },
    invalidatesTags: MONEY_TAGS,
  }),

  deleteTransaction: builder.mutation<void, string>({
    async queryFn(id) {
      const { error } = await supabase.from('transactions').delete().eq('id', id);

      if (error) return toApiError(error);
      return { data: undefined };
    },
    invalidatesTags: MONEY_TAGS,
  }),
});
