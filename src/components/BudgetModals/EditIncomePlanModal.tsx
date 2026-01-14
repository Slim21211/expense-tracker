import { useState, useEffect } from 'react';
import { Modal } from '@/components/Modal/Modal';
import {
  useGetExpenseCategoriesQuery,
  useUpdateIncomeItemMutation,
  useCreateExpenseItemMutation,
  useUpdateExpenseItemMutation,
  useDeleteExpenseItemMutation,
} from '@/services/api';
import styles from './BudgetModals.module.scss';
import type {
  IncomeItem,
  ExpenseItem,
  ExpenseCategory,
} from '@/types/database';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  income: IncomeItem;
  currentPlans: ExpenseItem[];
}

interface ExpensePlan {
  id: string;
  category_id: string;
  planned_amount: string;
  isExisting: boolean;
  existingId?: string;
}

export const EditIncomePlanModal = ({
  isOpen,
  onClose,
  income,
  currentPlans,
}: Props) => {
  const { data: categories = [] } = useGetExpenseCategoriesQuery();
  const [updateIncome, { isLoading: isUpdatingIncome }] =
    useUpdateIncomeItemMutation();
  const [createExpense] = useCreateExpenseItemMutation();
  const [updateExpense] = useUpdateExpenseItemMutation();
  const [deleteExpense] = useDeleteExpenseItemMutation();

  const [name, setName] = useState(income.name);
  const [plannedAmount, setPlannedAmount] = useState(
    income.planned_amount.toString()
  );
  const [plannedDate, setPlannedDate] = useState(income.planned_date || '');
  const [expensePlans, setExpensePlans] = useState<ExpensePlan[]>([]);

  useEffect(() => {
    // Загружаем существующие планы
    setExpensePlans(
      currentPlans.map((p) => ({
        id: p.id,
        category_id: p.category_id,
        planned_amount: p.planned_amount.toString(),
        isExisting: true,
        existingId: p.id,
      }))
    );
  }, [currentPlans]);

  const totalPlanned = expensePlans.reduce(
    (sum, plan) => sum + (parseFloat(plan.planned_amount) || 0),
    0
  );
  const unallocated = (parseFloat(plannedAmount) || 0) - totalPlanned;

  const addExpensePlan = () => {
    setExpensePlans([
      ...expensePlans,
      {
        id: Date.now().toString(),
        category_id: '',
        planned_amount: '',
        isExisting: false,
      },
    ]);
  };

  const updateExpensePlan = (id: string, field: string, value: string) => {
    setExpensePlans(
      expensePlans.map((plan) =>
        plan.id === id ? { ...plan, [field]: value } : plan
      )
    );
  };

  const removeExpensePlan = async (id: string) => {
    const plan = expensePlans.find((p) => p.id === id);
    if (plan?.isExisting && plan.existingId) {
      // Удаляем из БД
      await deleteExpense({
        id: plan.existingId,
        budget_month_id: income.budget_month_id,
      });
    }
    setExpensePlans(expensePlans.filter((plan) => plan.id !== id));
  };

  const handleSubmit = async () => {
    if (!name || !plannedAmount) return;

    // ✅ Собираем ВСЕ операции в массив
    const operations = [];

    // Обновляем доход
    operations.push(
      updateIncome({
        id: income.id,
        name,
        planned_amount: parseFloat(plannedAmount),
        planned_date: plannedDate || null,
      })
    );

    // Обновляем/создаем планы расходов
    for (const plan of expensePlans) {
      if (!plan.category_id || !plan.planned_amount) continue;

      if (plan.isExisting && plan.existingId) {
        // Обновляем существующий
        operations.push(
          updateExpense({
            id: plan.existingId,
            budget_month_id: income.budget_month_id,
            category_id: plan.category_id,
            planned_amount: parseFloat(plan.planned_amount),
          })
        );
      } else {
        // Создаем новый
        operations.push(
          createExpense({
            budget_month_id: income.budget_month_id,
            category_id: plan.category_id,
            name: income.id, // Связь с доходом
            planned_amount: parseFloat(plan.planned_amount),
            actual_amount: null,
            transaction_date: null,
            notes: null,
            is_from_bank: false,
            bank_transaction_id: null,
          })
        );
      }
    }

    // ✅ Выполняем ВСЕ операции параллельно!
    await Promise.all(operations);

    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Редактировать план дохода">
      <div className={styles.form}>
        <div className={styles.field}>
          <label className={styles.label}>Название дохода *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Аванс, Зарплата, Премия..."
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
                {categories.map((cat: ExpenseCategory) => (
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
            disabled={isUpdatingIncome || !name || !plannedAmount}
            className={styles.submitBtn}
          >
            {isUpdatingIncome ? 'Сохранение...' : 'Сохранить изменения'}
          </button>
          <button onClick={onClose} className={styles.cancelBtn}>
            Отмена
          </button>
        </div>
      </div>
    </Modal>
  );
};
