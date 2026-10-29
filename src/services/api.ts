import { createApi } from '@reduxjs/toolkit/query/react';
import { accountsEndpoints } from './api/accounts';
import { transactionsEndpoints } from './api/transactions';
import { budgetMonthsEndpoints } from './api/budgetMonths';
import { categoriesEndpoints } from './api/categories';
import { incomeItemsEndpoints } from './api/incomeItems';
import { baseQuery } from './api/types';

export const api = createApi({
  reducerPath: 'api',
  baseQuery,
  keepUnusedDataFor: 300, // 5 минут кеш
  tagTypes: ['Accounts', 'Transactions', 'BudgetMonths', 'ExpenseCategories'],
  endpoints: (builder) => ({
    ...accountsEndpoints(builder),
    ...transactionsEndpoints(builder),
    ...budgetMonthsEndpoints(builder),
    ...categoriesEndpoints(builder),
    ...incomeItemsEndpoints(builder),
  }),
});

export const {
  // Accounts
  useGetAccountsQuery,
  useCreateAccountMutation,
  useUpdateAccountMutation,
  // Transactions
  useGetTransactionsQuery,
  useCreateTransactionMutation,
  useUpdateTransactionMutation,
  useDeleteTransactionMutation,
  // Budget Months
  useGetBudgetMonthsQuery,
  useGetBudgetMonthByIdQuery,
  useCreateBudgetMonthMutation,
  // Income plans
  useSaveIncomePlanMutation,
  useGetRecentIncomePlansQuery,
  useCopyMonthPlansMutation,
  useDeleteIncomeItemMutation,
  // Categories
  useGetExpenseCategoriesQuery,
  useCreateExpenseCategoryMutation,
  useUpdateExpenseCategoryMutation,
  useDeleteExpenseCategoryMutation,
} = api;
