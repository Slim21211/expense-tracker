import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useGetBudgetMonthsQuery,
  useCreateBudgetMonthMutation,
} from '@/services/api';
import { Modal } from '@/components/Modal/Modal';
import { Icon } from '@/components/Icon/Icon';
import type { BudgetMonthWithTotals } from '@/types/database';
import { getCurrentMonth, getMonthName } from '@/utils/dateUtils';
import { errorMessage, formatMoney } from '@/utils/ledger';
import form from '@/styles/form.module.scss';
import styles from './MonthsListPage.module.scss';

// Предлагаем первый месяц, начиная с текущего, которого ещё нет
function suggestMonth(months: BudgetMonthWithTotals[]) {
  let { month, year } = getCurrentMonth();
  while (months.some((m) => m.month === month && m.year === year)) {
    month = month === 12 ? 1 : month + 1;
    year = month === 1 ? year + 1 : year;
  }
  return { month, year };
}

export const MonthsListPage = () => {
  const navigate = useNavigate();
  const { data: months = [], isLoading } = useGetBudgetMonthsQuery();
  const [createMonth, { isLoading: isSaving }] = useCreateBudgetMonthMutation();
  const [newMonth, setNewMonth] = useState<null | { month: number; year: number }>(null);

  const { year: currentYear } = getCurrentMonth();
  const years = [currentYear - 1, currentYear, currentYear + 1];

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!newMonth) return;
    try {
      const created = await createMonth({ ...newMonth, name: null }).unwrap();
      navigate(`/months/${created.id}`);
    } catch (error) {
      alert(errorMessage(error));
    }
  };

  if (isLoading) {
    return <div className={styles.loading}>Загрузка...</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Бюджет</h1>
        <button
          onClick={() => setNewMonth(suggestMonth(months))}
          className={styles.addBtn}
        >
          <Icon name="plus" size={16} />
          Месяц
        </button>
      </div>

      {months.length === 0 ? (
        <div className={styles.empty}>
          <p>Пока нет ни одного месяца</p>
          <button
            onClick={() => setNewMonth(suggestMonth(months))}
            className={form.primaryBtn}
          >
            Создать первый месяц
          </button>
        </div>
      ) : (
        <div className={styles.list}>
          {months.map((month) => (
            <button
              key={month.id}
              onClick={() => navigate(`/months/${month.id}`)}
              className={styles.card}
            >
              <span className={styles.cardTop}>
                <span className={styles.cardTitle}>
                  {month.name || `${getMonthName(month.month)} ${month.year}`}
                </span>
                <span
                  className={`${styles.remaining} ${
                    month.remaining < 0 ? styles.negative : ''
                  }`}
                >
                  {formatMoney(month.remaining)}
                </span>
              </span>
              <span className={styles.stats}>
                <span>
                  <span className={styles.statLabel}>Поступило</span>
                  {formatMoney(month.actual_income)}
                </span>
                <span>
                  <span className={styles.statLabel}>Потрачено</span>
                  {formatMoney(month.actual_expenses)}
                </span>
              </span>
            </button>
          ))}
        </div>
      )}

      {newMonth && (
        <Modal isOpen={true} onClose={() => setNewMonth(null)} title="Новый месяц">
          <form onSubmit={handleCreate} className={form.form}>
            <div className={form.row}>
              <label className={form.field}>
                <span className={form.label}>Месяц</span>
                <select
                  value={newMonth.month}
                  onChange={(e) =>
                    setNewMonth({ ...newMonth, month: Number(e.target.value) })
                  }
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <option key={m} value={m}>
                      {getMonthName(m)}
                    </option>
                  ))}
                </select>
              </label>
              <label className={form.field}>
                <span className={form.label}>Год</span>
                <select
                  value={newMonth.year}
                  onChange={(e) =>
                    setNewMonth({ ...newMonth, year: Number(e.target.value) })
                  }
                >
                  {years.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className={form.actions}>
              <button type="submit" disabled={isSaving} className={form.primaryBtn}>
                {isSaving ? 'Создание...' : 'Создать'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
