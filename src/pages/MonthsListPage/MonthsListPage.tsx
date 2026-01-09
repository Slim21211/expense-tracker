import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useGetBudgetMonthsQuery,
  useCreateBudgetMonthMutation,
} from '@/services/api';
import styles from './MonthsListPage.module.scss';
import { getCurrentMonth, getMonthName } from '@/utils/dateUtils';

export const MonthsListPage = () => {
  const navigate = useNavigate();
  const { data: months = [], isLoading } = useGetBudgetMonthsQuery();
  const [createMonth] = useCreateBudgetMonthMutation();
  const [isCreating, setIsCreating] = useState(false);
  const [newMonthData, setNewMonthData] = useState(() => {
    const { month, year } = getCurrentMonth();
    return { month, year, name: '' };
  });

  const handleCreateMonth = async () => {
    if (newMonthData.month && newMonthData.year) {
      const result = await createMonth({
        month: newMonthData.month,
        year: newMonthData.year,
        name: newMonthData.name || undefined,
      });

      if ('data' in result && result.data) {
        navigate(`/months/${result.data.id}`);
      }
    }
  };

  if (isLoading) {
    return <div className={styles.loading}>Загрузка...</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>📅 Месячные бюджеты</h1>
        <button
          onClick={() => setIsCreating(true)}
          className={styles.addButton}
        >
          + Создать месяц
        </button>
      </div>

      {isCreating && (
        <div className={styles.createForm}>
          <h3 className={styles.formTitle}>Новый месяц</h3>

          <div className={styles.formRow}>
            <div className={styles.field}>
              <label className={styles.label}>Месяц</label>
              <select
                value={newMonthData.month}
                onChange={(e) =>
                  setNewMonthData({
                    ...newMonthData,
                    month: parseInt(e.target.value),
                  })
                }
                className={styles.select}
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
                  <option key={m} value={m}>
                    {getMonthName(m)}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Год</label>
              <input
                type="number"
                value={newMonthData.year}
                onChange={(e) =>
                  setNewMonthData({
                    ...newMonthData,
                    year: parseInt(e.target.value),
                  })
                }
                className={styles.input}
                min="2020"
                max="2030"
              />
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Название (опционально)</label>
            <input
              type="text"
              value={newMonthData.name}
              onChange={(e) =>
                setNewMonthData({ ...newMonthData, name: e.target.value })
              }
              placeholder={`${getMonthName(newMonthData.month)} ${
                newMonthData.year
              }`}
              className={styles.input}
            />
          </div>

          <div className={styles.formActions}>
            <button onClick={handleCreateMonth} className={styles.createBtn}>
              Создать
            </button>
            <button
              onClick={() => setIsCreating(false)}
              className={styles.cancelBtn}
            >
              Отмена
            </button>
          </div>
        </div>
      )}

      {months.length === 0 ? (
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>📊</div>
          <h2 className={styles.emptyTitle}>Нет бюджетов</h2>
          <p className={styles.emptyText}>
            Создайте первый месячный бюджет для планирования доходов и расходов
          </p>
          <button
            onClick={() => setIsCreating(true)}
            className={styles.emptyButton}
          >
            Создать первый бюджет
          </button>
        </div>
      ) : (
        <div className={styles.grid}>
          {months.map((month) => (
            <div
              key={month.id}
              onClick={() => navigate(`/months/${month.id}`)}
              className={styles.card}
            >
              <div className={styles.cardHeader}>
                <h3 className={styles.cardTitle}>
                  {month.name || `${getMonthName(month.month)} ${month.year}`}
                </h3>
                <div className={styles.cardDate}>
                  {getMonthName(month.month)} {month.year}
                </div>
              </div>

              <div className={styles.cardStats}>
                <div className={styles.stat}>
                  <div className={styles.statLabel}>Доход</div>
                  <div className={styles.statValue}>
                    {month.total_actual_income 
                      ? `${month.total_actual_income.toLocaleString('ru-RU')} ₽`
                      : '—'}
                  </div>
                </div>
                <div className={styles.stat}>
                  <div className={styles.statLabel}>Расходы</div>
                  <div className={styles.statValue}>
                    {month.total_actual_expenses
                      ? `${month.total_actual_expenses.toLocaleString('ru-RU')} ₽`
                      : '—'}
                  </div>
                </div>
                <div className={styles.stat}>
                  <div className={styles.statLabel}>Остаток</div>
                  <div className={`${styles.statValue} ${
                    month.balance && month.balance < 0 ? styles.negative : ''
                  }`}>
                    {month.balance !== undefined
                      ? `${month.balance.toLocaleString('ru-RU')} ₽`
                      : '—'}
                  </div>
                </div>
              </div>

              <div className={styles.cardFooter}>
                <span className={styles.viewLink}>Открыть →</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
