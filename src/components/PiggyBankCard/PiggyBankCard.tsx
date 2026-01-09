import { useState } from 'react';
import {
  useUpdatePiggyBankMutation,
  useCreatePiggyBankTransactionMutation,
} from '@/services/api';
import type { PiggyBank, PiggyBankTransactionType } from '@/types/database';
import styles from './PiggyBankCard.module.scss';

interface PiggyBankCardProps {
  piggyBank: PiggyBank;
}

type ActionType = 'deposit' | 'expense' | 'debt' | null;

export const PiggyBankCard = ({ piggyBank }: PiggyBankCardProps) => {
  const [updatePiggyBank] = useUpdatePiggyBankMutation();
  const [createTransaction] = useCreatePiggyBankTransactionMutation();
  const [isEditing, setIsEditing] = useState(false);
  const [actionType, setActionType] = useState<ActionType>(null);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');

  const progress =
    piggyBank.target_amount > 0
      ? (piggyBank.current_amount / piggyBank.target_amount) * 100
      : 0;

  const handleAction = async () => {
    if (!amount || parseFloat(amount) <= 0 || !actionType) return;

    const amountValue = parseFloat(amount);

    if (actionType === 'deposit') {
      // Пополнение - просто обновляем баланс
      await updatePiggyBank({
        id: piggyBank.id,
        current_amount: piggyBank.current_amount + amountValue,
      });
    } else {
      // Расход или долг - создаем транзакцию (баланс обновится автоматически через триггер)
      await createTransaction({
        piggy_bank_id: piggyBank.id,
        type: actionType as PiggyBankTransactionType,
        amount: amountValue,
        description: description || null,
        transaction_date: new Date().toISOString(),
      });
    }

    setAmount('');
    setDescription('');
    setIsEditing(false);
    setActionType(null);
  };

  const handleCancel = () => {
    setAmount('');
    setDescription('');
    setIsEditing(false);
    setActionType(null);
  };

  return (
    <div className={styles.card} style={{ borderLeftColor: piggyBank.color }}>
      <div className={styles.header}>
        <div className={styles.icon}>{piggyBank.icon}</div>
        <h3 className={styles.name}>{piggyBank.name}</h3>
      </div>

      <div className={styles.amounts}>
        <div className={styles.currentAmount}>
          {piggyBank.current_amount.toLocaleString('ru-RU')} ₽
        </div>
        <div className={styles.targetAmount}>
          из {piggyBank.target_amount.toLocaleString('ru-RU')} ₽
        </div>
      </div>

      <div className={styles.progressBar}>
        <div
          className={styles.progressFill}
          style={{
            width: `${Math.min(Math.abs(progress), 100)}%`,
            backgroundColor:
              progress < 0 ? 'var(--color-error)' : piggyBank.color,
          }}
        />
      </div>

      <div className={styles.progressText}>
        {progress.toFixed(1)}% {progress < 0 ? '(в долгу)' : 'достигнуто'}
      </div>

      {isEditing ? (
        <div className={styles.editForm}>
          {!actionType ? (
            <div className={styles.actionButtons}>
              <button
                onClick={() => setActionType('deposit')}
                className={styles.actionBtn}
              >
                + Пополнить
              </button>
              <button
                onClick={() => setActionType('expense')}
                className={styles.actionBtnExpense}
              >
                − Расход
              </button>
              <button
                onClick={() => setActionType('debt')}
                className={styles.actionBtnDebt}
              >
                💳 В долг
              </button>
            </div>
          ) : (
            <>
              <div className={styles.actionTitle}>
                {actionType === 'deposit' && '💰 Пополнение'}
                {actionType === 'expense' && '🛒 Расход'}
                {actionType === 'debt' && '💳 Взять в долг'}
              </div>

              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Сумма"
                className={styles.input}
                autoFocus
              />

              {(actionType === 'expense' || actionType === 'debt') && (
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Описание (опционально)"
                  className={styles.input}
                />
              )}

              <div className={styles.buttonGroup}>
                <button onClick={handleAction} className={styles.saveButton}>
                  {actionType === 'deposit'
                    ? 'Пополнить'
                    : actionType === 'expense'
                    ? 'Списать'
                    : 'Взять'}
                </button>
                <button onClick={handleCancel} className={styles.cancelButton}>
                  Отмена
                </button>
              </div>
            </>
          )}
        </div>
      ) : (
        <button onClick={() => setIsEditing(true)} className={styles.addButton}>
          ⚡ Операция
        </button>
      )}
    </div>
  );
};
