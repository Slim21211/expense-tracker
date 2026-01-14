import { useState } from 'react';
import { Modal } from '@/components/Modal/Modal';
import { useCreateExpenseTransactionMutation } from '@/services/api';
import type { ExpenseCategory } from '@/types/database';
import styles from './BudgetModals.module.scss';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  incomeItemId: string;
  incomeName: string;
  plannedCategories: Array<{ category_id: string; category: ExpenseCategory }>;
}

export const AddExpenseModal = ({
  isOpen,
  onClose,
  incomeItemId,
  incomeName,
  plannedCategories,
}: Props) => {
  const [createExpense, { isLoading }] = useCreateExpenseTransactionMutation();
  const [categoryId, setCategoryId] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = async () => {
    if (!categoryId || !amount || parseFloat(amount) <= 0) return;

    try {
      await createExpense({
        income_item_id: incomeItemId,
        category_id: categoryId,
        amount: parseFloat(amount),
        description: description || undefined,
      }).unwrap();

      setCategoryId('');
      setAmount('');
      setDescription('');
      onClose();
    } catch (error) {
      console.error('Failed to create expense:', error);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Внести расход: ${incomeName}`}>
      <div className={styles.form}>
        <div className={styles.field}>
          <label className={styles.label}>Категория *</label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className={styles.select}
          >
            <option value="">Выберите категорию</option>
            {plannedCategories.map((pc) => (
              <option key={pc.category_id} value={pc.category_id}>
                {pc.category?.icon} {pc.category?.name}
              </option>
            ))}
          </select>
          <div className={styles.hint}>
            Доступны только категории из плана
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Сумма *</label>
          <input
            type="number" step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0"
            className={styles.input}
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Описание</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Магазин, чек №..."
            className={styles.input}
          />
        </div>

        <div className={styles.actions}>
          <button
            onClick={handleSubmit}
            disabled={
              isLoading || !categoryId || !amount || parseFloat(amount) <= 0
            }
            className={styles.submitBtn}
          >
            {isLoading ? 'Добавление...' : 'Добавить расход'}
          </button>
          <button onClick={onClose} className={styles.cancelBtn}>
            Отмена
          </button>
        </div>
      </div>
    </Modal>
  );
};
