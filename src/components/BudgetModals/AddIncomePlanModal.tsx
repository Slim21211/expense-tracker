import { useState } from 'react';
import { Modal } from '@/components/Modal/Modal';
import {
  useGetExpenseCategoriesQuery,
  useCreateIncomeWithPlansMutation,
} from '@/services/api';
import styles from './BudgetModals.module.scss';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  budgetMonthId: string;
}

interface ExpensePlan {
  id: string;
  category_id: string;
  planned_amount: string;
}

export const AddIncomePlanModal = ({
  isOpen,
  onClose,
  budgetMonthId,
}: Props) => {
  const { data: categories = [] } = useGetExpenseCategoriesQuery();
  const [createIncome, { isLoading }] = useCreateIncomeWithPlansMutation();

  const [name, setName] = useState('');
  const [plannedAmount, setPlannedAmount] = useState('');
  const [plannedDate, setPlannedDate] = useState('');
  const [expensePlans, setExpensePlans] = useState<ExpensePlan[]>([]);

  const totalPlanned = expensePlans.reduce(
    (sum, plan) => sum + (parseFloat(plan.planned_amount) || 0),
    0
  );
  const unallocated = (parseFloat(plannedAmount) || 0) - totalPlanned;

  const addExpensePlan = () => {
    setExpensePlans([
      ...expensePlans,
      { id: Date.now().toString(), category_id: '', planned_amount: '' },
    ]);
  };

  const updateExpensePlan = (id: string, field: string, value: string) => {
    setExpensePlans(
      expensePlans.map((plan) =>
        plan.id === id ? { ...plan, [field]: value } : plan
      )
    );
  };

  const removeExpensePlan = (id: string) => {
    setExpensePlans(expensePlans.filter((plan) => plan.id !== id));
  };

  const handleSubmit = async () => {
    if (!name || !plannedAmount) return;

    const validPlans = expensePlans.filter(
      (p) => p.category_id && parseFloat(p.planned_amount) > 0
    );

    try {
      await createIncome({
        budget_month_id: budgetMonthId,
        name,
        planned_amount: parseFloat(plannedAmount),
        planned_date: plannedDate || null,
        expense_plans: validPlans.map((p) => ({
          category_id: p.category_id,
          planned_amount: parseFloat(p.planned_amount),
        })),
      }).unwrap();

      // Reset form
      setName('');
      setPlannedAmount('');
      setPlannedDate('');
      setExpensePlans([]);
      onClose();
    } catch (error) {
      console.error('Failed to create income plan:', error);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Добавить план">
      <div className={styles.form}>
        <div className={styles.field}>
          <label className={styles.label}>Название дохода *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Аванс, Зарплата..."
            className={styles.input}
          />
        </div>

        <div className={styles.row}>
          <div className={styles.field}>
            <label className={styles.label}>Плановая сумма *</label>
            <input
              type="number"
              step="0.01"
              value={plannedAmount}
              onChange={(e) => setPlannedAmount(e.target.value)}
              placeholder="0"
              className={styles.input}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Дата</label>
            <input
              type="date"
              value={plannedDate}
              onChange={(e) => setPlannedDate(e.target.value)}
              className={styles.input}
            />
          </div>
        </div>

        <div className={styles.divider} />

        <div className={styles.section}>
          <h4 className={styles.sectionTitle}>Планы расходов</h4>

          {expensePlans.map((plan) => (
            <div key={plan.id} className={styles.expensePlanRow}>
              <select
                value={plan.category_id}
                onChange={(e) =>
                  updateExpensePlan(plan.id, 'category_id', e.target.value)
                }
                className={styles.select}
              >
                <option value="">Выберите категорию</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.icon} {cat.name}
                  </option>
                ))}
              </select>
              <input
                type="number"
                step="0.01"
                value={plan.planned_amount}
                onChange={(e) =>
                  updateExpensePlan(plan.id, 'planned_amount', e.target.value)
                }
                placeholder="Сумма"
                className={styles.input}
              />
              <button
                onClick={() => removeExpensePlan(plan.id)}
                className={styles.removeBtn}
              >
                ✕
              </button>
            </div>
          ))}

          <button onClick={addExpensePlan} className={styles.addPlanBtn}>
            + Добавить расход в план
          </button>

          {plannedAmount && (
            <div className={styles.unallocated}>
              <span>Не распределено:</span>
              <strong className={unallocated < 0 ? styles.negative : ''}>
                {unallocated.toLocaleString('ru-RU')} ₽
              </strong>
            </div>
          )}
        </div>

        <div className={styles.actions}>
          <button
            onClick={handleSubmit}
            disabled={isLoading || !name || !plannedAmount}
            className={styles.submitBtn}
          >
            {isLoading ? 'Создание...' : 'Создать план'}
          </button>
          <button onClick={onClose} className={styles.cancelBtn}>
            Отмена
          </button>
        </div>
      </div>
    </Modal>
  );
};
