import { supabase } from '@/services/supabase';

export const expenseTransactionsEndpoints = (builder: any) => ({
  getExpenseTransactions: builder.query({
    async queryFn(incomeItemId: string) {
      const { data, error } = await supabase
        .from('expense_transactions')
        .select('*, category:expense_categories(*)')
        .eq('income_item_id', incomeItemId)
        .order('transaction_date', { ascending: false });

      if (error) return { error };
      return { data: data || [] };
    },
    providesTags: (_result: any, _error: any, id: string) => [
      { type: 'ExpenseTransactions', id },
    ],
  }),

  createExpenseTransaction: builder.mutation({
    async queryFn(data: {
      income_item_id: string;
      category_id: string;
      amount: number;
      description?: string;
    }) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return { error: { message: 'User not authenticated' } };

      // Получаем данные
      const [incomeResult, categoryResult] = await Promise.all([
        supabase
          .from('income_items')
          .select('budget_month_id')
          .eq('id', data.income_item_id)
          .single(),
        supabase
          .from('expense_categories')
          .select('name')
          .eq('id', data.category_id)
          .single(),
      ]);

      if (incomeResult.error) return { error: incomeResult.error };
      if (categoryResult.error) return { error: categoryResult.error };

      // Создаём транзакцию
      const { data: transaction, error: transactionError } = await supabase
        .from('expense_transactions')
        .insert({
          user_id: user.id,
          budget_month_id: incomeResult.data.budget_month_id,
          income_item_id: data.income_item_id,
          category_id: data.category_id,
          amount: data.amount,
          description: data.description || null,
          transaction_date: new Date().toISOString().split('T')[0],
        })
        .select()
        .single();

      if (transactionError) return { error: transactionError };

      // ✅ ИСПРАВЛЕНИЕ: Только обновляем баланс, НЕ создаём piggy_bank_transactions
      // (это создаётся только через карточку копилки)
      const categoryName = categoryResult.data.name;

      const [piggyBankResult, creditResult] = await Promise.all([
        supabase
          .from('piggy_banks')
          .select('id, current_amount')
          .eq('user_id', user.id)
          .eq('name', categoryName)
          .eq('is_archived', false)
          .single(),
        supabase
          .from('credits')
          .select('id, paid_amount')
          .eq('user_id', user.id)
          .eq('name', categoryName)
          .eq('is_archived', false)
          .single(),
      ]);

      const updates = [];

      if (piggyBankResult.data) {
        // ✅ ТОЛЬКО обновляем баланс (пополняем копилку)
        updates.push(
          supabase
            .from('piggy_banks')
            .update({
              current_amount: piggyBankResult.data.current_amount + data.amount,
            })
            .eq('id', piggyBankResult.data.id)
        );
      }

      if (creditResult.data) {
        updates.push(
          supabase
            .from('credits')
            .update({
              paid_amount: creditResult.data.paid_amount + data.amount,
            })
            .eq('id', creditResult.data.id)
        );
      }

      if (updates.length > 0) {
        await Promise.all(updates);
      }

      return { data: transaction };
    },
    invalidatesTags: (result: any) => {
      const tags: any[] = [
        { type: 'ExpenseTransactions', id: 'LIST' },
        'PiggyBanks',
        'Credits',
      ];
      if (result?.budget_month_id) {
        tags.push({ type: 'BudgetMonths', id: result.budget_month_id });
      }
      return tags;
    },
  }),

  deleteExpenseTransaction: builder.mutation({
    async queryFn(transactionId: string) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return { error: { message: 'User not authenticated' } };

      // Получаем транзакцию
      const { data: transaction, error: fetchError } = await supabase
        .from('expense_transactions')
        .select(
          'amount, category_id, budget_month_id, category:expense_categories(name)'
        )
        .eq('id', transactionId)
        .single();

      if (fetchError) return { error: fetchError };

      // Удаляем транзакцию
      const { error: deleteError } = await supabase
        .from('expense_transactions')
        .delete()
        .eq('id', transactionId);

      if (deleteError) return { error: deleteError };

      // ✅ Откатываем изменения в копилке/кредите
      if (
        transaction &&
        transaction.category &&
        typeof transaction.category === 'object' &&
        'name' in transaction.category
      ) {
        const categoryName = transaction.category.name as string;

        const [piggyBankResult, creditResult] = await Promise.all([
          supabase
            .from('piggy_banks')
            .select('id, current_amount')
            .eq('user_id', user.id)
            .eq('name', categoryName)
            .eq('is_archived', false)
            .single(),
          supabase
            .from('credits')
            .select('id, paid_amount')
            .eq('user_id', user.id)
            .eq('name', categoryName)
            .eq('is_archived', false)
            .single(),
        ]);

        const updates = [];

        if (piggyBankResult.data) {
          // ✅ Откатываем баланс (вычитаем из копилки)
          updates.push(
            supabase
              .from('piggy_banks')
              .update({
                current_amount:
                  piggyBankResult.data.current_amount - transaction.amount,
              })
              .eq('id', piggyBankResult.data.id)
          );
        }

        if (creditResult.data) {
          updates.push(
            supabase
              .from('credits')
              .update({
                paid_amount: creditResult.data.paid_amount - transaction.amount,
              })
              .eq('id', creditResult.data.id)
          );
        }

        if (updates.length > 0) {
          await Promise.all(updates);
        }
      }

      return { data: undefined };
    },
    invalidatesTags: (_result: any, _error: any, _transactionId: string) => [
      { type: 'ExpenseTransactions', id: 'LIST' },
      'BudgetMonths',
      'PiggyBanks',
      'Credits',
    ],
  }),
});
