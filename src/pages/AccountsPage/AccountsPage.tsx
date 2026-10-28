import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGetAccountsQuery } from '@/services/api';
import { AccountModal } from '@/components/AccountModal/AccountModal';
import { Icon } from '@/components/Icon/Icon';
import type { AccountKind, AccountWithBalance } from '@/types/database';
import { formatMoney } from '@/utils/ledger';
import { AccountCard } from './AccountCard';
import styles from './AccountsPage.module.scss';

const SECTIONS: { kind: AccountKind; title: string }[] = [
  { kind: 'regular', title: 'Счета' },
  { kind: 'savings', title: 'Копилки' },
  { kind: 'credit', title: 'Кредиты' },
];

export const AccountsPage = () => {
  const navigate = useNavigate();
  const { data: accounts = [], isLoading } = useGetAccountsQuery();
  const [showHidden, setShowHidden] = useState(false);
  const [modal, setModal] = useState<
    null | { account?: AccountWithBalance; kind?: AccountKind }
  >(null);

  // Скрытые: архивные и вне учёта
  const isHidden = (a: AccountWithBalance) => a.is_archived || !a.track_balance;
  const visible = accounts.filter((a) => showHidden || !isHidden(a));
  const active = accounts.filter((a) => !isHidden(a));
  const sum = (kind: AccountKind) =>
    active.filter((a) => a.kind === kind).reduce((s, a) => s + a.balance, 0);

  if (isLoading) {
    return <div className={styles.loading}>Загрузка...</div>;
  }

  return (
    <div className={styles.container}>
      <section className={styles.summary}>
        <span className={styles.summaryLabel}>Всего денег</span>
        <span className={styles.summaryValue}>
          {formatMoney(sum('regular') + sum('savings'))}
        </span>
        <div className={styles.summaryStats}>
          <span>
            <span className={styles.statLabel}>На счетах</span>
            {formatMoney(sum('regular'))}
          </span>
          <span>
            <span className={styles.statLabel}>В копилках</span>
            {formatMoney(sum('savings'))}
          </span>
          <span>
            <span className={styles.statLabel}>Долг</span>
            {formatMoney(-sum('credit'))}
          </span>
        </div>
      </section>

      {SECTIONS.map(({ kind, title }) => {
        const items = visible.filter((a) => a.kind === kind);
        return (
          <section key={kind} className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>{title}</h2>
              <button onClick={() => setModal({ kind })} className={styles.linkButton}>
                <Icon name="plus" size={16} />
                Добавить
              </button>
            </div>
            {items.length > 0 && (
              <div className={styles.card}>
                {items.map((account) => (
                  <AccountCard
                    key={account.id}
                    account={account}
                    onOpen={() => navigate(`/transactions?account=${account.id}`)}
                    onEdit={() => setModal({ account })}
                  />
                ))}
              </div>
            )}
          </section>
        );
      })}

      {accounts.some(isHidden) && (
        <button onClick={() => setShowHidden(!showHidden)} className={styles.linkButton}>
          {showHidden ? 'Скрыть архив и счета вне учёта' : 'Показать архив и счета вне учёта'}
        </button>
      )}

      {modal && (
        <AccountModal
          account={modal.account}
          kind={modal.kind}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
};
