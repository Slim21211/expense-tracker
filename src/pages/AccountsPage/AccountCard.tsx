import { Icon } from '@/components/Icon/Icon';
import type { AccountWithBalance } from '@/types/database';
import { formatMoney } from '@/utils/ledger';
import styles from './AccountCard.module.scss';

interface Props {
  account: AccountWithBalance;
  onOpen: () => void;
  onEdit: () => void;
}

export const AccountCard = ({ account, onOpen, onEdit }: Props) => {
  const target = account.target_amount ?? 0;

  // Копилка: накоплено / цель. Кредит: погашено / сумма кредита (баланс кредита ≤ 0)
  const progress =
    account.track_balance && target > 0
      ? account.kind === 'savings'
        ? (account.balance / target) * 100
        : account.kind === 'credit'
        ? ((target + account.balance) / target) * 100
        : null
      : null;

  const progressText = !account.track_balance
    ? 'вне учёта'
    : target > 0
    ? account.kind === 'credit'
      ? `погашено ${Math.max(0, progress ?? 0).toFixed(0)}% из ${formatMoney(target)}`
      : `${Math.max(0, progress ?? 0).toFixed(0)}% из ${formatMoney(target)}`
    : null;
  const debtText = account.debt > 0 ? `в долгу ${formatMoney(account.debt)}` : null;
  const subtitle = [progressText, debtText].filter(Boolean).join(' · ') || null;

  return (
    <div className={`${styles.item} ${account.is_archived ? styles.archived : ''}`}>
      <button className={styles.main} onClick={onOpen}>
        <span className={styles.icon} style={{ background: `${account.color}26` }}>
          {account.icon}
        </span>
        <span className={styles.body}>
          <span className={styles.top}>
            <span className={styles.name}>{account.name}</span>
            {account.track_balance && (
              <span
                className={`${styles.balance} ${
                  account.balance < 0 && account.kind !== 'credit' ? styles.negative : ''
                }`}
              >
                {formatMoney(account.kind === 'credit' ? -account.balance : account.balance)}
              </span>
            )}
          </span>
          {subtitle && <span className={styles.subtitle}>{subtitle}</span>}
          {progress !== null && (
            <span className={styles.progress}>
              <span
                className={styles.progressFill}
                style={{
                  width: `${Math.max(0, Math.min(progress, 100))}%`,
                  background: account.color,
                }}
              />
            </span>
          )}
        </span>
      </button>
      <button onClick={onEdit} className={styles.editBtn} aria-label="Редактировать">
        <Icon name="edit" size={16} />
      </button>
    </div>
  );
};
