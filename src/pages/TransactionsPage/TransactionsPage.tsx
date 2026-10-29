import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  useGetAccountsQuery,
  useGetBudgetMonthsQuery,
  useGetExpenseCategoriesQuery,
  useGetTransactionsQuery,
} from '@/services/api';
import { OUTSIDE_BUDGET } from '@/services/api/transactions';
import { TransactionList } from '@/components/TransactionList/TransactionList';
import { TransactionModal } from '@/components/TransactionModal/TransactionModal';
import { Icon } from '@/components/Icon/Icon';
import type { Transaction, TransactionDraft } from '@/types/database';
import { getMonthName } from '@/utils/dateUtils';
import { formatMoney } from '@/utils/ledger';
import styles from './TransactionsPage.module.scss';

const PAGE_SIZE = 100;

export const TransactionsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const accountId = searchParams.get('account') ?? '';
  const monthId = searchParams.get('month') ?? '';
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [activeModal, setActiveModal] = useState<null | {
    transaction?: Transaction;
    defaults?: Partial<TransactionDraft>;
  }>(null);

  const { data: accounts = [] } = useGetAccountsQuery();
  const { data: categories = [] } = useGetExpenseCategoriesQuery();
  const { data: months = [] } = useGetBudgetMonthsQuery();
  const { data: transactions = [], isLoading } = useGetTransactionsQuery({
    account_id: accountId || undefined,
    budget_month_id: monthId || undefined,
    limit,
  });

  const setFilter = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    setSearchParams(next);
    setLimit(PAGE_SIZE);
  };

  const account = accounts.find((a) => a.id === accountId);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Операции</h1>
        <button
          onClick={() =>
            setActiveModal({
              // Без фильтра по месяцу модалка сама подставит текущий месяц бюджета
              defaults: {
                ...(account?.kind === 'regular' && { from_account_id: account.id }),
                ...(monthId && {
                  budget_month_id: monthId === OUTSIDE_BUDGET ? null : monthId,
                }),
              },
            })
          }
          className={styles.addButton}
        >
          <Icon name="plus" size={16} />
          Операция
        </button>
      </div>

      <div className={styles.filters}>
        <select value={accountId} onChange={(e) => setFilter('account', e.target.value)}>
          <option value="">Все счета</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.icon} {a.name}
              {a.is_archived ? ' (архив)' : ''}
            </option>
          ))}
        </select>
        <select value={monthId} onChange={(e) => setFilter('month', e.target.value)}>
          <option value="">Все месяцы</option>
          <option value={OUTSIDE_BUDGET}>Вне бюджета</option>
          {months.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name || `${getMonthName(m.month)} ${m.year}`}
            </option>
          ))}
        </select>
      </div>

      {account && (
        <div className={styles.balance}>
          <span>
            {account.icon} {account.name}
            {account.track_balance && (
              <>
                : <strong>{formatMoney(account.balance)}</strong>
              </>
            )}
          </span>
          {account.debt > 0 && (
            <div className={styles.debt}>
              <span>
                Взято в долг: <strong>{formatMoney(account.debt)}</strong>
              </span>
              <button
                onClick={() =>
                  setActiveModal({
                    defaults: {
                      kind: 'transfer',
                      to_account_id: account.id,
                      amount: account.debt,
                      purpose: 'repayment',
                    },
                  })
                }
                className={styles.addButton}
              >
                Погасить
              </button>
            </div>
          )}
        </div>
      )}

      {isLoading ? (
        <div className={styles.loading}>Загрузка...</div>
      ) : (
        <>
          <div className={styles.card}>
            <TransactionList
              transactions={transactions}
              accounts={accounts}
              categories={categories}
              accountId={accountId || undefined}
              onSelect={(transaction) => setActiveModal({ transaction })}
            />
          </div>
          {transactions.length >= limit && (
            <button onClick={() => setLimit(limit + PAGE_SIZE)} className={styles.more}>
              Показать ещё
            </button>
          )}
        </>
      )}

      {activeModal && (
        <TransactionModal
          transaction={activeModal.transaction}
          defaults={activeModal.defaults}
          onClose={() => setActiveModal(null)}
        />
      )}
    </div>
  );
};
