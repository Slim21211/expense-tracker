import { useState } from 'react';
import { useGetCreditsQuery } from '@/services/api';
import styles from './Creditspage.module.scss';
import { CreditCard } from '@/components/Creditcard/Creditcard';
import { CreateCreditModal } from '@/components/Createcreditmodal/Createcreditmodal';

export const CreditsPage = () => {
  const { data: credits = [], isLoading } = useGetCreditsQuery();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const totalDebt = credits.reduce(
    (sum, c) => sum + (c.target_amount - c.paid_amount),
    0
  );
  const totalPaid = credits.reduce((sum, c) => sum + c.paid_amount, 0);
  const totalCredit = credits.reduce((sum, c) => sum + c.target_amount, 0);
  const overallProgress = totalCredit > 0 ? (totalPaid / totalCredit) * 100 : 0;

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Загрузка...</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Кредиты</h1>
          <p className={styles.subtitle}>
            Осталось выплатить:{' '}
            <strong>{totalDebt.toLocaleString('ru-RU')} ₽</strong>
          </p>
        </div>
        <button
          className={styles.addButton}
          onClick={() => setIsModalOpen(true)}
        >
          <span>+</span>
          Добавить кредит
        </button>
      </div>

      {credits.length > 0 && (
        <div className={styles.summary}>
          <div className={styles.summaryContent}>
            <div className={styles.summaryText}>
              <div className={styles.summaryLabel}>
                Общий прогресс погашения
              </div>
              <div className={styles.summaryValue}>
                {totalPaid.toLocaleString('ru-RU')} ₽ из{' '}
                {totalCredit.toLocaleString('ru-RU')} ₽
              </div>
            </div>
            <div className={styles.progressBar}>
              <div
                className={styles.progressFill}
                style={{ width: `${Math.min(overallProgress, 100)}%` }}
              />
            </div>
            <div className={styles.progressPercent}>
              {overallProgress.toFixed(1)}%
            </div>
          </div>
        </div>
      )}

      {credits.length === 0 ? (
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>💳</div>
          <h2 className={styles.emptyTitle}>Кредитов пока нет</h2>
          <p className={styles.emptyText}>
            Добавьте кредит для отслеживания погашения
          </p>
          <button
            className={styles.emptyButton}
            onClick={() => setIsModalOpen(true)}
          >
            Добавить кредит
          </button>
        </div>
      ) : (
        <div className={styles.grid}>
          {credits.map((credit) => (
            <CreditCard key={credit.id} credit={credit} />
          ))}
        </div>
      )}

      {isModalOpen && (
        <CreateCreditModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </div>
  );
};
