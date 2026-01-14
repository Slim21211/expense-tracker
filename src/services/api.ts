import { createApi, fakeBaseQuery } from '@reduxjs/toolkit/query/react';
import { piggyBanksEndpoints } from './api/piggyBanks';
import { creditsEndpoints } from './api/credits';
import { budgetMonthsEndpoints } from './api/budgetMonths';
import { categoriesEndpoints } from './api/categories';
import { incomeItemsEndpoints } from './api/incomeItems';
import { expenseItemsEndpoints } from './api/expenseItems';
import { expenseTransactionsEndpoints } from './api/expenseTransactions';
import { incomeDebtsEndpoints } from './api/incomeDebts';

export const api = createApi({
  reducerPath: 'api',
  baseQuery: fakeBaseQuery(),
  keepUnusedDataFor: 300, // ✅ 5 минут кеш - избегает повторных запросов
  tagTypes: [
    'PiggyBanks',
    'Credits',
    'BudgetMonths',
    'ExpenseCategories',
    'IncomeItems',
    'ExpenseItems',
    'PiggyBankTransactions',
    'ExpenseTransactions',
    'IncomeDebts',
  ],
  endpoints: (builder) => ({
    ...piggyBanksEndpoints(builder),
    ...creditsEndpoints(builder),
    ...budgetMonthsEndpoints(builder),
    ...categoriesEndpoints(builder),
    ...incomeItemsEndpoints(builder),
    ...expenseItemsEndpoints(builder),
    ...expenseTransactionsEndpoints(builder),
    ...incomeDebtsEndpoints(builder),
  }),
});

export const {
  // Piggy Banks
  useGetPiggyBanksQuery,
  useCreatePiggyBankMutation,
  useUpdatePiggyBankMutation,
  useDeletePiggyBankMutation,
  useGetPiggyBankTransactionsQuery,
  useCreatePiggyBankTransactionMutation,
  // Credits
  useGetCreditsQuery,
  useCreateCreditMutation,
  useUpdateCreditMutation,
  useDeleteCreditMutation,
  // Budget Months
  useGetBudgetMonthsQuery,
  useGetBudgetMonthByIdQuery,
  useCreateBudgetMonthMutation,
  // Categories
  useGetExpenseCategoriesQuery,
  useCreateExpenseCategoryMutation,
  useDeleteExpenseCategoryMutation,
  // Income Items
  useCreateIncomeItemMutation,
  useUpdateIncomeItemMutation,
  useDeleteIncomeItemMutation,
  useAddActualIncomeMutation,
  useCreateIncomeWithPlansMutation,
  // Expense Items
  useCreateExpenseItemMutation,
  useUpdateExpenseItemMutation,
  useDeleteExpenseItemMutation,
  // Expense Transactions
  useGetExpenseTransactionsQuery,
  useCreateExpenseTransactionMutation,
  useDeleteExpenseTransactionMutation,
  // Income Debts
  useCreateIncomeDebtMutation,
  useGetIncomeDebtsQuery,
} = api;
