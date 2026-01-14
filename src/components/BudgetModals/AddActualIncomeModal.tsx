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

type Mode = 'add' | 'set';

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
  const [mode, setMode] = useState<Mode>('add');

  const handleSubmit = async () => {
    if (!amount || parseFloat(amount) <= 0) return;

    try {
      const finalAmount =
        mode === 'add'
          ? currentActualAmount + parseFloat(amount)
          : parseFloat(amount);

      await addIncome({
        id: incomeItemId,
        actual_amount: finalAmount,
        actual_date: new Date().toISOString().split('T')[0],
      }).unwrap();

      setAmount('');
      onClose();
    } catch (error) {
      console.error('Failed to add income:', error);
    }
  };

  const handleClose = () => {
    setAmount('');
    setMode('add');
    onClose();
  };

  const resultAmount =
    mode === 'add'
      ? currentActualAmount + parseFloat(amount || '0')
      : parseFloat(amount || '0');

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Внести фактический доход">
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

        {/* Переключатель режима */}
        <div className={styles.modeToggle}>
          <button
            type="button"
            onClick={() => setMode('add')}
            className={`${styles.modeBtn} ${mode === 'add' ? styles.modeBtnActive : ''}`}
          >
            ➕ Добавить к текущему
          </button>
          <button
            type="button"
            onClick={() => setMode('set')}
            className={`${styles.modeBtn} ${mode === 'set' ? styles.modeBtnActive : ''}`}
          >
            ✏️ Установить точную сумму
          </button>
        </div>

        <div className={styles.field}>
          <label className={styles.label}>
            {mode === 'add' ? 'Сумма для добавления *' : 'Точная сумма фактического дохода *'}
          </label>
          <input
            type="number"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0"
            className={styles.input}
            autoFocus
          />
          {mode === 'add' && (
            <div className={styles.hint}>
              Сумма будет добавлена к текущему фактическому доходу
            </div>
          )}
          {mode === 'set' && (
            <div className={styles.hint}>
              Текущая сумма будет заменена на указанную
            </div>
          )}
        </div>

        {amount && parseFloat(amount) > 0 && (
          <div className={styles.resultCard}>
            <span>
              {mode === 'add' ? 'Новый факт будет:' : 'Факт станет:'}
            </span>
            <strong>
              {resultAmount.toLocaleString('ru-RU')} ₽
            </strong>
          </div>
        )}

        <div className={styles.actions}>
          <button
            onClick={handleSubmit}
            disabled={isLoading || !amount || parseFloat(amount) <= 0}
            className={styles.submitBtn}
          >
            {isLoading ? 'Сохранение...' : mode === 'add' ? 'Добавить' : 'Установить'}
          </button>
          <button onClick={handleClose} className={styles.cancelBtn}>
            Отмена
          </button>
        </div>
      </div>
    </Modal>
  );
};
