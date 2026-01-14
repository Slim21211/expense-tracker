import { useState } from 'react';
import { Modal } from '@/components/Modal/Modal';
import { useGetPiggyBanksQuery, useCreateIncomeDebtMutation } from '@/services/api';
import styles from './BudgetModals.module.scss';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  incomeItemId: string;
  incomeName: string;
}

export const TakeDebtModal = ({
  isOpen,
  onClose,
  incomeItemId,
  incomeName,
}: Props) => {
  const { data: piggyBanks = [] } = useGetPiggyBanksQuery();
  const [createDebt, { isLoading }] = useCreateIncomeDebtMutation();

  const [piggyBankId, setPiggyBankId] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');

  const selectedPiggyBank = piggyBanks.find((pb) => pb.id === piggyBankId);
  const maxAmount = selectedPiggyBank?.current_amount || 0;

  const handleSubmit = async () => {
    if (!piggyBankId || !amount || parseFloat(amount) <= 0) return;
    if (parseFloat(amount) > maxAmount) return;

    try {
      await createDebt({
        income_item_id: incomeItemId,
        piggy_bank_id: piggyBankId,
        amount: parseFloat(amount),
        description: description || undefined,
      }).unwrap();

      setPiggyBankId('');
      setAmount('');
      setDescription('');
      onClose();
    } catch (error) {
      console.error('Failed to take debt:', error);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Взять в долг: ${incomeName}`}>
      <div className={styles.form}>
        <div className={styles.field}>
          <label className={styles.label}>Копилка *</label>
          <select
            value={piggyBankId}
            onChange={(e) => setPiggyBankId(e.target.value)}
            className={styles.select}
          >
            <option value="">Выберите копилку</option>
            {piggyBanks.map((pb) => (
              <option key={pb.id} value={pb.id}>
                {pb.icon} {pb.name} ({pb.current_amount.toLocaleString('ru-RU')}{' '}
                ₽)
              </option>
            ))}
          </select>
        </div>

        {selectedPiggyBank && (
          <div className={styles.infoCard}>
            <div className={styles.infoRow}>
              <span>Доступно:</span>
              <strong>{maxAmount.toLocaleString('ru-RU')} ₽</strong>
            </div>
          </div>
        )}

        <div className={styles.field}>
          <label className={styles.label}>Сумма *</label>
          <input
            type="number" step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0"
            max={maxAmount}
            className={styles.input}
          />
          {amount && parseFloat(amount) > maxAmount && (
            <div className={styles.error}>
              Сумма превышает доступный остаток
            </div>
          )}
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Примечание</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="На что берете..."
            className={styles.input}
          />
        </div>

        <div className={styles.actions}>
          <button
            onClick={handleSubmit}
            disabled={
              isLoading ||
              !piggyBankId ||
              !amount ||
              parseFloat(amount) <= 0 ||
              parseFloat(amount) > maxAmount
            }
            className={styles.submitBtn}
          >
            {isLoading ? 'Взятие в долг...' : 'Взять в долг'}
          </button>
          <button onClick={onClose} className={styles.cancelBtn}>
            Отмена
          </button>
        </div>
      </div>
    </Modal>
  );
};
