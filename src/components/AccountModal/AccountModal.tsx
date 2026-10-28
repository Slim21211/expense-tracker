import { FormEvent, useState } from 'react';
import { Modal } from '@/components/Modal/Modal';
import { AmountInput } from '@/components/AmountInput/AmountInput';
import {
  useCreateAccountMutation,
  useUpdateAccountMutation,
  useCreateTransactionMutation,
} from '@/services/api';
import type { AccountKind, AccountWithBalance } from '@/types/database';
import { todayISO } from '@/utils/dateUtils';
import { amountToInput, errorMessage, parseAmount } from '@/utils/ledger';
import styles from '@/styles/form.module.scss';

interface Props {
  onClose: () => void;
  account?: AccountWithBalance; // редактирование
  kind?: AccountKind; // тип нового счёта
}

const KIND_LABELS: Record<AccountKind, string> = {
  regular: 'Счёт / карта',
  savings: 'Копилка',
  credit: 'Кредит',
};

const ICONS = ['💳', '💵', '🏦', '💰', '🏠', '🚗', '✈️', '🎓', '💍', '🎮', '📱', '🏖️', '🗄️'];
const COLORS = ['#6366f1', '#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#64748b'];

export const AccountModal = ({ onClose, account, kind: initialKind }: Props) => {
  const [createAccount, { isLoading: isCreating }] = useCreateAccountMutation();
  const [updateAccount, { isLoading: isUpdating }] = useUpdateAccountMutation();
  const [createTransaction] = useCreateTransactionMutation();

  const [kind, setKind] = useState<AccountKind>(
    account?.kind ?? initialKind ?? 'regular'
  );
  const [name, setName] = useState(account?.name ?? '');
  const [icon, setIcon] = useState(account?.icon ?? ICONS[0]);
  const [color, setColor] = useState(account?.color ?? COLORS[0]);
  const [target, setTarget] = useState(
    amountToInput(account?.target_amount)
  );
  const [isArchived, setIsArchived] = useState(account?.is_archived ?? false);
  const [trackBalance, setTrackBalance] = useState(account?.track_balance ?? true);
  const [openingBalance, setOpeningBalance] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const targetAmount = target ? parseAmount(target) : null;

    try {
      if (account) {
        await updateAccount({
          id: account.id,
          name: name.trim(),
          icon,
          color,
          target_amount: targetAmount,
          is_archived: isArchived,
          track_balance: trackBalance,
        }).unwrap();
      } else {
        const created = await createAccount({
          name: name.trim(),
          kind,
          icon,
          color,
          target_amount: targetAmount,
          sort_order: kind === 'regular' ? 0 : kind === 'savings' ? 100 : 200,
          track_balance: trackBalance,
        }).unwrap();

        // Начальный остаток — явная корректировка, а не число в поле
        const opening = parseAmount(openingBalance);
        if (opening && trackBalance) {
          const delta = kind === 'credit' ? -Math.abs(opening) : opening;
          await createTransaction({
            kind: 'adjustment',
            amount: Math.abs(delta),
            from_account_id: delta < 0 ? created.id : null,
            to_account_id: delta > 0 ? created.id : null,
            category_id: null,
            budget_month_id: null,
            income_item_id: null,
            date: todayISO(),
            description: kind === 'credit' ? 'Текущий долг' : 'Начальный остаток',
          }).unwrap();
        }
      }
      onClose();
    } catch (error) {
      alert(errorMessage(error));
    }
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={account ? `Редактировать: ${account.name}` : `Новый: ${KIND_LABELS[kind].toLowerCase()}`}
    >
      <form onSubmit={handleSubmit} className={styles.form}>
        {!account && (
          <div className={styles.segmented}>
            {(Object.keys(KIND_LABELS) as AccountKind[]).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setKind(k)}
                className={`${styles.segment} ${kind === k ? styles.segmentActive : ''}`}
              >
                {KIND_LABELS[k]}
              </button>
            ))}
          </div>
        )}

        <div className={styles.field}>
          <label className={styles.label}>Название *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={kind === 'credit' ? 'Ипотека' : kind === 'savings' ? 'Отпуск' : 'Тинькофф'}
            autoFocus={!account}
          />
        </div>

        {kind !== 'regular' && (
          <div className={styles.field}>
            <label className={styles.label}>
              {kind === 'credit' ? 'Сумма кредита' : 'Цель накопления'}
            </label>
            <AmountInput value={target} onChange={setTarget} />
          </div>
        )}

        {kind !== 'credit' && (
          <label className={styles.checkbox}>
            <input
              type="checkbox"
              checked={!trackBalance}
              onChange={(e) => setTrackBalance(!e.target.checked)}
            />
            Вне учёта: переводы сюда считаются расходом из бюджета, баланс не показывается
          </label>
        )}

        {!account && trackBalance && (
          <div className={styles.field}>
            <label className={styles.label}>
              {kind === 'credit' ? 'Сколько осталось выплатить' : 'Текущий баланс'}
            </label>
            <AmountInput value={openingBalance} onChange={setOpeningBalance} />
            <div className={styles.hint}>
              Будет записано корректировкой — её видно в списке операций
            </div>
          </div>
        )}

        <div className={styles.field}>
          <label className={styles.label}>Иконка</label>
          <div className={styles.pickerRow}>
            {ICONS.map((i) => (
              <button
                key={i}
                type="button"
                onClick={() => setIcon(i)}
                className={`${styles.pickerBtn} ${icon === i ? styles.pickerBtnActive : ''}`}
              >
                {i}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Цвет</label>
          <div className={styles.pickerRow}>
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                style={{ background: c }}
                className={`${styles.pickerBtn} ${color === c ? styles.pickerBtnActive : ''}`}
              />
            ))}
          </div>
        </div>

        {account && (
          <label className={styles.checkbox}>
            <input
              type="checkbox"
              checked={isArchived}
              onChange={(e) => setIsArchived(e.target.checked)}
            />
            В архиве (скрыт из списков, история сохраняется)
          </label>
        )}

        <div className={styles.actions}>
          <button
            type="submit"
            disabled={isCreating || isUpdating || !name.trim()}
            className={styles.primaryBtn}
          >
            {isCreating || isUpdating ? 'Сохранение...' : account ? 'Сохранить' : 'Создать'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
