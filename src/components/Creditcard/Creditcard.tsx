import { useState } from 'react';
import { useDeleteCreditMutation } from '@/services/api';
import styles from './Creditcard.module.scss';

interface Credit {
  id: string;
  name: string;
  target_amount: number;
  paid_amount: number;
  color: string;
  icon: string;
}

interface CreditCardProps {
  credit: Credit;
}

export const CreditCard = ({ credit }: CreditCardProps) => {
  const [deleteCredit] = useDeleteCreditMutation();
  const [isDeleting, setIsDeleting] = useState(false);

  const remaining = credit.target_amount - credit.paid_amount;
  const progress =
    credit.target_amount > 0
      ? (credit.paid_amount / credit.target_amount) * 100
      : 0;

  const handleDelete = async () => {
    if (!confirm(`Удалить кредит "${credit.name}"?`)) return;

    setIsDeleting(true);
    try {
      await deleteCredit(credit.id).unwrap();
    } catch (error) {
      console.error('Failed to delete credit:', error);
      alert('Ошибка при удалении кредита');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className={styles.card} style={{ borderColor: credit.color }}>
      <div className={styles.header}>
        <div
          className={styles.iconWrapper}
          style={{ background: credit.color }}
        >
          <span className={styles.icon}>{credit.icon}</span>
        </div>
        <button
          onClick={handleDelete}
          disabled={isDeleting}
          className={styles.deleteButton}
          title="Удалить кредит"
        >
          {isDeleting ? '⏳' : '🗑️'}
        </button>
      </div>

      <h3 className={styles.title}>{credit.name}</h3>

      <div className={styles.amounts}>
        <div className={styles.amountRow}>
          <span className={styles.amountLabel}>Погашено:</span>
          <span className={styles.amountValue}>
            {credit.paid_amount.toLocaleString('ru-RU')} ₽
          </span>
        </div>
        <div className={styles.amountRow}>
          <span className={styles.amountLabel}>Всего:</span>
          <span className={styles.amountValue}>
            {credit.target_amount.toLocaleString('ru-RU')} ₽
          </span>
        </div>
        <div
          className={styles.amountRow}
          style={{ marginTop: 'var(--spacing-sm)' }}
        >
          <span
            className={styles.amountLabel}
            style={{ fontWeight: 'var(--font-weight-bold)' }}
          >
            Осталось:
          </span>
          <span
            className={styles.amountValue}
            style={{
              fontWeight: 'var(--font-weight-bold)',
              color: 'var(--color-error)',
            }}
          >
            {remaining.toLocaleString('ru-RU')} ₽
          </span>
        </div>
      </div>

      <div className={styles.progress}>
        <div className={styles.progressBar}>
          <div
            className={styles.progressFill}
            style={{
              width: `${Math.min(progress, 100)}%`,
              background: credit.color,
            }}
          />
        </div>
        <span className={styles.progressText}>{progress.toFixed(1)}%</span>
      </div>

      <div className={styles.hint}>
        Погашайте через расходы в категорию "{credit.name}"
      </div>
    </div>
  );
};
