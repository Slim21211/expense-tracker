import { useState } from 'react';
import { Modal } from '@/components/Modal/Modal';
import { useAddActualIncomeMutation } from '@/services/api';
import styles from './BudgetModals.module.scss';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  incomeItemId: string;
  incomeName: string;
  plannedAmount: number;
  currentActualAmount: number;
}

export const AddActualIncomeModal = ({
  isOpen,
  onClose,
  incomeItemId,
  incomeName,
  plannedAmount,
  currentActualAmount,
}: Props) => {
  const [addIncome, { isLoading }] = useAddActualIncomeMutation();
  const [amount, setAmount] = useState('');

  const handleSubmit = async () => {
    if (!amount || parseFloat(amount) <= 0) return;

    try {
      await addIncome({
        income_item_id: incomeItemId,
        amount: parseFloat(amount),
      }).unwrap();

      setAmount('');
      onClose();
    } catch (error) {
      console.error('Failed to add income:', error);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Внести фактический доход">
      <div className={styles.form}>
        <div className={styles.infoCard}>
          <h4>{incomeName}</h4>
          <div className={styles.infoRow}>
            <span>План:</span>
            <strong>{plannedAmount.toLocaleString('ru-RU')} ₽</strong>
          </div>
          <div className={styles.infoRow}>
            <span>Текущий факт:</span>
            <strong>{currentActualAmount.toLocaleString('ru-RU')} ₽</strong>
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Сумма для добавления *</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0"
            className={styles.input}
            autoFocus
          />
          <div className={styles.hint}>
            Сумма будет добавлена к текущему фактическому доходу
          </div>
        </div>

        {amount && (
          <div className={styles.resultCard}>
            <span>Новый факт будет:</span>
            <strong>
              {(currentActualAmount + parseFloat(amount)).toLocaleString(
                'ru-RU'
              )}{' '}
              ₽
            </strong>
          </div>
        )}

        <div className={styles.actions}>
          <button
            onClick={handleSubmit}
            disabled={isLoading || !amount || parseFloat(amount) <= 0}
            className={styles.submitBtn}
          >
            {isLoading ? 'Добавление...' : 'Добавить'}
          </button>
          <button onClick={onClose} className={styles.cancelBtn}>
            Отмена
          </button>
        </div>
      </div>
    </Modal>
  );
};
