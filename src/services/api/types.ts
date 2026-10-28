import { fakeBaseQuery, type EndpointBuilder } from '@reduxjs/toolkit/query/react';

export type TagType = 'Accounts' | 'Transactions' | 'BudgetMonths' | 'ExpenseCategories';

export type ApiError = { message: string };

export const baseQuery = fakeBaseQuery<ApiError>();

export type Builder = EndpointBuilder<typeof baseQuery, TagType, 'api'>;

// Всё, что меняет деньги, сбрасывает все производные данные
export const MONEY_TAGS: TagType[] = ['Accounts', 'Transactions', 'BudgetMonths'];

export function toApiError(error: { message: string }): { error: ApiError } {
  return { error: { message: error.message } };
}
