import { useState } from 'react';
import { useGetPiggyBanksQuery } from '@/services/api';
import { PiggyBankCard } from '@/components/PiggyBankCard/PiggyBankCard';
import { CreatePiggyBankModal } from '@/components/CreatePiggyBankModal/CreatePiggyBankModal';
import styles from './DashboardPage.module.scss';

export const DashboardPage = () => {
  const { data: piggyBanks = [], isLoading } = useGetPiggyBanksQuery();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const totalSavings = piggyBanks.reduce(
    (sum, pb) => sum + pb.current_amount,
    0
  );
  const totalTarget = piggyBanks.reduce((sum, pb) => sum + pb.target_amount, 0);
  const overallProgress =
    totalTarget > 0 ? (totalSavings / totalTarget) * 100 : 0;

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
          <h1 className={styles.title}>Копилки</h1>
          <p className={styles.subtitle}>
            Всего накоплено:{' '}
            <strong>{totalSavings.toLocaleString('ru-RU')} ₽</strong>
          </p>
        </div>
        <button
          className={styles.addButton}
          onClick={() => setIsModalOpen(true)}
        >
          <span>+</span>
          Добавить копилку
        </button>
      </div>

      {piggyBanks.length > 0 && (
        <div className={styles.summary}>
          <div className={styles.summaryContent}>
            <div className={styles.summaryText}>
              <div className={styles.summaryLabel}>Общий прогресс</div>
              <div className={styles.summaryValue}>
                {totalSavings.toLocaleString('ru-RU')} ₽ из{' '}
                {totalTarget.toLocaleString('ru-RU')} ₽
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

      {piggyBanks.length === 0 ? (
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>🐷</div>
          <h2 className={styles.emptyTitle}>Копилок пока нет</h2>
          <p className={styles.emptyText}>
            Создайте свою первую копилку для накоплений
          </p>
          <button
            className={styles.emptyButton}
            onClick={() => setIsModalOpen(true)}
          >
            Создать копилку
          </button>
        </div>
      ) : (
        <div className={styles.grid}>
          {piggyBanks.map((piggyBank) => (
            <PiggyBankCard key={piggyBank.id} piggyBank={piggyBank} />
          ))}
        </div>
      )}

      {isModalOpen && (
        <CreatePiggyBankModal 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
        />
      )}
    </div>
  );
};
