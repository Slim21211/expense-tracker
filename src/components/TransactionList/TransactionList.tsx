import type {
  AccountWithBalance,
  ExpenseCategory,
  Transaction,
} from '@/types/database';
import { Icon } from '@/components/Icon/Icon';
import { formatFullDate } from '@/utils/dateUtils';
import { accountDelta, formatMoney } from '@/utils/ledger';
import styles from './TransactionList.module.scss';

interface Props {
  transactions: Transaction[];
  accounts: AccountWithBalance[];
  categories: ExpenseCategory[];
  onSelect: (transaction: Transaction) => void;
  // Знак суммы считается относительно этого счёта (страница счёта)
  accountId?: string;
  showTotal?: boolean;
}

export const TransactionList = ({
  transactions,
  accounts,
  categories,
  onSelect,
  accountId,
  showTotal,
}: Props) => {
  if (transactions.length === 0) {
    return <div className={styles.empty}>Операций нет</div>;
  }

  const accountById = new Map(accounts.map((a) => [a.id, a]));
  const categoryById = new Map(categories.map((c) => [c.id, c]));
  const accountName = (id: string | null) =>
    (id && accountById.get(id)?.name) || '—';

  const describe = (t: Transaction) => {
    switch (t.kind) {
      case 'expense': {
        const category = t.category_id ? categoryById.get(t.category_id) : null;
        return {
          icon: category?.icon ?? <Icon name="tag" size={18} />,
          title: category?.name ?? 'Без категории',
          subtitle: accountName(t.from_account_id),
          sign: -1,
        };
      }
      case 'income':
        return {
          icon: <Icon name="income" size={18} />,
          title: 'Доход',
          subtitle: accountName(t.to_account_id),
          sign: 1,
        };
      case 'transfer': {
        const to = t.to_account_id ? accountById.get(t.to_account_id) : null;
        return {
          icon: to?.icon ?? <Icon name="transfer" size={18} />,
          title: (
            <>
              {accountName(t.from_account_id)}
              <Icon name="forward" size={14} className={styles.titleArrow} />
              {accountName(t.to_account_id)}
            </>
          ),
          subtitle:
            t.purpose === 'loan'
              ? 'В долг из копилки'
              : t.purpose === 'repayment'
              ? 'Возврат долга'
              : 'Перевод',
          sign: 0,
        };
      }
      case 'adjustment':
        return {
          icon: <Icon name="adjust" size={18} />,
          title: 'Корректировка',
          subtitle: accountName(t.to_account_id ?? t.from_account_id),
          sign: t.to_account_id ? 1 : -1,
        };
    }
  };

  const signed = (t: Transaction, sign: number) =>
    accountId ? accountDelta(t, accountId) : sign * t.amount;

  let lastDate = '';
  const total = transactions.reduce(
    (sum, t) => sum + (accountId ? accountDelta(t, accountId) : t.amount),
    0
  );

  return (
    <div>
      <div className={styles.list}>
        {transactions.map((t) => {
          const d = describe(t);
          const value = signed(t, d.sign);
          const showDate = t.date !== lastDate;
          lastDate = t.date;

          return (
            <div key={t.id}>
              {showDate && (
                <div className={styles.dateHeader}>{formatFullDate(t.date)}</div>
              )}
              <button className={styles.item} onClick={() => onSelect(t)}>
                <span className={styles.icon}>{d.icon}</span>
                <span className={styles.info}>
                  <span className={styles.title}>{d.title}</span>
                  <span className={styles.subtitle}>
                    {[d.subtitle, t.description].filter(Boolean).join(' · ')}
                  </span>
                </span>
                <span
                  className={`${styles.amount} ${
                    value > 0 ? styles.plus : value < 0 ? styles.minus : styles.neutral
                  }`}
                >
                  {value > 0 ? '+' : value < 0 ? '−' : ''}
                  {formatMoney(Math.abs(value || t.amount))}
                </span>
              </button>
            </div>
          );
        })}
      </div>

      {showTotal && (
        <div className={styles.total}>
          <span>Итого</span>
          <span>{formatMoney(total)}</span>
        </div>
      )}
    </div>
  );
};
