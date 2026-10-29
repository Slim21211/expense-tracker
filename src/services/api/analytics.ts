import { supabase } from '@/services/supabase';
import { toApiError, type Builder } from './types';

export interface MonthKey {
  year: number;
  month: number;
}

export interface SpendingRow extends MonthKey {
  category_id: string | null;
  amount: number;
}

export interface PlanRow extends MonthKey {
  category_id: string;
  planned: number;
}

export interface MonthTotalsRow extends MonthKey {
  income: number;
  spending: number;
}

export interface AccountFlowRow extends MonthKey {
  account_id: string;
  delta: number;
}

export interface AnalyticsData {
  spending: SpendingRow[];
  plan: PlanRow[];
  months: MonthTotalsRow[];
  accountFlows: AccountFlowRow[];
}

// numeric из PostgREST может прийти строкой
const num = <T extends object>(rows: T[], fields: (keyof T)[]): T[] =>
  rows.map((r) => {
    const copy = { ...r };
    for (const f of fields) (copy[f] as unknown) = Number(r[f]);
    return copy;
  });

export const analyticsEndpoints = (builder: Builder) => ({
  // Готовые итоги из представлений analytics_* (миграция 005)
  getAnalytics: builder.query<AnalyticsData, void>({
    async queryFn() {
      const [spending, plan, months, flows] = await Promise.all([
        supabase.from('analytics_spending').select('*'),
        supabase.from('analytics_plan').select('*'),
        supabase.from('analytics_months').select('*'),
        supabase.from('analytics_account_flows').select('*'),
      ]);

      for (const r of [spending, plan, months, flows]) {
        if (r.error) return toApiError(r.error);
      }

      return {
        data: {
          spending: num(spending.data as SpendingRow[], ['amount', 'year', 'month']),
          plan: num(plan.data as PlanRow[], ['planned', 'year', 'month']),
          months: num(months.data as MonthTotalsRow[], ['income', 'spending', 'year', 'month']),
          accountFlows: num(flows.data as AccountFlowRow[], ['delta', 'year', 'month']),
        },
      };
    },
    providesTags: ['Transactions', 'BudgetMonths'],
  }),
});
