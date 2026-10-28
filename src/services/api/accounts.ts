import { supabase } from '@/services/supabase';
import type { Account, AccountWithBalance } from '@/types/database';
import { MONEY_TAGS, toApiError, type Builder } from './types';

export type AccountInput = Pick<
  Account,
  'name' | 'kind' | 'icon' | 'color' | 'target_amount' | 'sort_order' | 'track_balance'
>;

export const accountsEndpoints = (builder: Builder) => ({
  // Все счета, включая архивные — они нужны для отображения старых операций
  getAccounts: builder.query<AccountWithBalance[], void>({
    async queryFn() {
      const [accountsResult, balancesResult] = await Promise.all([
        supabase
          .from('accounts')
          .select('*')
          .order('sort_order', { ascending: true })
          .order('created_at', { ascending: true }),
        supabase.from('account_balances').select('account_id, balance'),
      ]);

      if (accountsResult.error) return toApiError(accountsResult.error);
      if (balancesResult.error) return toApiError(balancesResult.error);

      const balances = new Map<string, number>(
        balancesResult.data.map((b) => [b.account_id, Number(b.balance)])
      );

      return {
        data: (accountsResult.data as Account[]).map((a) => ({
          ...a,
          target_amount: a.target_amount === null ? null : Number(a.target_amount),
          balance: balances.get(a.id) ?? 0,
        })),
      };
    },
    providesTags: ['Accounts'],
  }),

  createAccount: builder.mutation<Account, AccountInput>({
    async queryFn(account) {
      const { data, error } = await supabase
        .from('accounts')
        .insert(account)
        .select()
        .single();

      if (error) return toApiError(error);
      return { data };
    },
    invalidatesTags: MONEY_TAGS,
  }),

  updateAccount: builder.mutation<
    Account,
    Partial<Omit<AccountInput, 'kind'>> & { id: string; is_archived?: boolean }
  >({
    async queryFn({ id, ...updates }) {
      const { data, error } = await supabase
        .from('accounts')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) return toApiError(error);
      return { data };
    },
    invalidatesTags: MONEY_TAGS,
  }),
});
