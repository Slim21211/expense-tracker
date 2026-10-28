import { FormEvent, useState } from 'react';
import { Modal } from '@/components/Modal/Modal';
import { AmountInput } from '@/components/AmountInput/AmountInput';
import {
  useGetAccountsQuery,
  useGetExpenseCategoriesQuery,
  useGetBudgetMonthsQuery,
  useGetBudgetMonthByIdQuery,
  useCreateTransactionMutation,
  useUpdateTransactionMutation,
  useDeleteTransactionMutation,
} from '@/services/api';
import { useBudgetContext } from '@/hooks/useBudgetContext';
import type {
  AccountWithBalance,
  Transaction,
  TransactionDraft,
  TransactionKind,
} from '@/types/database';
import { getMonthName, todayISO } from '@/utils/dateUtils';
import { amountToInput, errorMessage, formatMoney, parseAmount } from '@/utils/ledger';
import styles from '@/styles/form.module.scss';

interface Props {
  onClose: () => void;
  transaction?: Transaction; // редактирование
  defaults?: Partial<TransactionDraft>; // предзаполнение при создании
}

const KIND_LABELS: Record<TransactionKind, string> = {
  expense: 'Расход',
  income: 'Доход',
  transfer: 'Перевод',
  adjustment: 'Корректировка',
};

const accountLabel = (a: AccountWithBalance) =>
  a.track_balance
    ? `${a.icon} ${a.name} · ${formatMoney(a.balance)}`
    : `${a.icon} ${a.name} · вне учёта`;

export const TransactionModal = ({ onClose, transaction, defaults }: Props) => {
  const initial: Partial<TransactionDraft> = transaction ?? defaults ?? {};
  const isEdit = Boolean(transaction);

  const { data: accounts = [] } = useGetAccountsQuery();
  const { data: categories = [] } = useGetExpenseCategoriesQuery();
  const { data: months = [] } = useGetBudgetMonthsQuery();
  const budget = useBudgetContext();

  const [createTransaction, { isLoading: isCreating }] = useCreateTransactionMutation();
  const [updateTransaction, { isLoading: isUpdating }] = useUpdateTransactionMutation();
  const [deleteTransaction, { isLoading: isDeleting }] = useDeleteTransactionMutation();

  const firstRegular = accounts.find((a) => a.kind === 'regular' && !a.is_archived);

  const [kind, setKind] = useState<TransactionKind>(initial.kind ?? 'expense');
  const [amount, setAmount] = useState(amountToInput(initial.amount));
  const [fromId, setFromId] = useState(initial.from_account_id ?? '');
  const [toId, setToId] = useState(initial.to_account_id ?? '');
  const [categoryId, setCategoryId] = useState(initial.category_id ?? '');
  const [date, setDate] = useState(initial.date ?? todayISO());
  const [description, setDescription] = useState(initial.description ?? '');

  // Привязка к бюджету: null — не трогали, берём из операции/контекста
  const [monthChoice, setMonthChoice] = useState<string | null>(null);
  const [incomeChoice, setIncomeChoice] = useState<string | null>(null);

  // Корректировка: при создании вводится реальный баланс, при редактировании — изменение
  const [adjustAccountId, setAdjustAccountId] = useState(
    initial.to_account_id ?? initial.from_account_id ?? ''
  );
  const [adjustSign, setAdjustSign] = useState<1 | -1>(
    transaction?.kind === 'adjustment' && transaction.from_account_id ? -1 : 1
  );
  const [actualBalance, setActualBalance] = useState('');

  const contextMonthId =
    isEdit || 'budget_month_id' in initial || kind === 'adjustment'
      ? initial.budget_month_id ?? ''
      : budget.monthId ?? '';
  const budgetMonthId = monthChoice ?? contextMonthId;

  const { data: monthDetails } = useGetBudgetMonthByIdQuery(budgetMonthId, {
    skip: !budgetMonthId,
  });
  const incomeItems = monthDetails?.income_items ?? [];
  const contextIncomeId =
    isEdit || 'income_item_id' in initial
      ? initial.income_item_id ?? ''
      : budgetMonthId === budget.monthId
      ? budget.defaultIncomeId ?? ''
      : '';
  const incomeItemId =
    incomeChoice ?? (monthChoice === null ? contextIncomeId : '');

  // Архивные счета/категории показываем, только если они уже выбраны
  const selectableAccounts = (selected: string) =>
    accounts.filter((a) => !a.is_archived || a.id === selected);
  const selectableCategories = categories.filter(
    (c) => !c.is_archived || c.id === categoryId
  );

  // Значения по умолчанию подставляются в момент отправки,
  // чтобы не зависеть от того, успели ли загрузиться счета
  const effectiveFrom = fromId || (kind !== 'income' ? firstRegular?.id ?? '' : '');
  const effectiveTo = toId || (kind === 'income' ? firstRegular?.id ?? '' : '');

  const adjustAccount = accounts.find((a) => a.id === adjustAccountId);
  const adjustDelta = (() => {
    if (kind !== 'adjustment') return 0;
    if (isEdit) return adjustSign * (parseAmount(amount) || 0);
    const target = parseAmount(actualBalance);
    if (!adjustAccount || isNaN(target)) return 0;
    return Math.round((target - adjustAccount.balance) * 100) / 100;
  })();

  const buildDraft = (): TransactionDraft | string => {
    const base = {
      kind,
      date,
      description: description.trim() || null,
      budget_month_id: budgetMonthId || null,
      income_item_id: incomeItemId || null,
      category_id: null as string | null,
      from_account_id: null as string | null,
      to_account_id: null as string | null,
    };

    if (kind === 'adjustment') {
      if (!adjustAccountId) return 'Выберите счёт';
      if (adjustDelta === 0) return 'Баланс уже совпадает';
      return {
        ...base,
        amount: Math.abs(adjustDelta),
        from_account_id: adjustDelta < 0 ? adjustAccountId : null,
        to_account_id: adjustDelta > 0 ? adjustAccountId : null,
      };
    }

    const value = parseAmount(amount);
    if (!value || value <= 0) return 'Введите сумму';

    if (kind === 'expense') {
      if (!effectiveFrom) return 'Выберите счёт';
      return {
        ...base,
        amount: value,
        from_account_id: effectiveFrom,
        category_id: categoryId || null,
      };
    }
    if (kind === 'income') {
      if (!effectiveTo) return 'Выберите счёт';
      return { ...base, amount: value, to_account_id: effectiveTo };
    }
    if (!effectiveFrom || !toId) return 'Выберите оба счёта';
    if (effectiveFrom === toId) return 'Счета должны различаться';
    return { ...base, amount: value, from_account_id: effectiveFrom, to_account_id: toId };
  };

  const draft = buildDraft();
  const validationError = typeof draft === 'string' ? draft : null;
  const isBusy = isCreating || isUpdating || isDeleting;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (typeof draft === 'string' || isBusy) return;
    try {
      if (transaction) {
        await updateTransaction({ id: transaction.id, ...draft }).unwrap();
      } else {
        await createTransaction(draft).unwrap();
      }
      onClose();
    } catch (error) {
      alert(errorMessage(error));
    }
  };

  const handleDelete = async () => {
    if (!transaction || !confirm('Удалить операцию?')) return;
    try {
      await deleteTransaction(transaction.id).unwrap();
      onClose();
    } catch (error) {
      alert(errorMessage(error));
    }
  };

  const accountSelect = (
    label: string,
    value: string,
    onChange: (id: string) => void
  ) => (
    <label className={styles.field}>
      <span className={styles.label}>{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">Выберите счёт</option>
        {selectableAccounts(value).map((a) => (
          <option key={a.id} value={a.id}>
            {accountLabel(a)}
          </option>
        ))}
      </select>
    </label>
  );

  const month = months.find((m) => m.id === budgetMonthId);
  const income = incomeItems.find((i) => i.id === incomeItemId);
  const budgetSummary = month
    ? `${month.name || `${getMonthName(month.month)} ${month.year}`}${
        income ? ` · ${income.name}` : ''
      }`
    : 'вне бюджета';

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={isEdit ? 'Операция' : 'Новая операция'}
    >
      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.segmented}>
          {(Object.keys(KIND_LABELS) as TransactionKind[]).map((k) => (
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

        {kind === 'adjustment' ? (
          <>
            {accountSelect('Счёт', adjustAccountId, setAdjustAccountId)}
            {isEdit ? (
              <div className={styles.row}>
                <label className={styles.field}>
                  <span className={styles.label}>Направление</span>
                  <select
                    value={adjustSign}
                    onChange={(e) => setAdjustSign(Number(e.target.value) as 1 | -1)}
                  >
                    <option value={1}>Увеличить</option>
                    <option value={-1}>Уменьшить</option>
                  </select>
                </label>
                <label className={styles.field}>
                  <span className={styles.label}>Сумма</span>
                  <AmountInput value={amount} onChange={setAmount} />
                </label>
              </div>
            ) : (
              <label className={styles.field}>
                <span className={styles.label}>Реальный баланс счёта</span>
                <AmountInput
                  value={actualBalance}
                  onChange={setActualBalance}
                  allowNegative
                  placeholder={adjustAccount ? amountToInput(adjustAccount.balance) : '0'}
                />
                {adjustAccount && adjustDelta !== 0 && (
                  <span className={styles.hint}>
                    Сейчас в приложении {formatMoney(adjustAccount.balance)}, баланс{' '}
                    {adjustDelta > 0 ? 'увеличится' : 'уменьшится'} на{' '}
                    {formatMoney(Math.abs(adjustDelta))}
                  </span>
                )}
              </label>
            )}
          </>
        ) : (
          <div className={styles.row}>
            <label className={styles.field}>
              <span className={styles.label}>Сумма</span>
              <AmountInput value={amount} onChange={setAmount} autoFocus={!isEdit} />
            </label>
            <label className={styles.field}>
              <span className={styles.label}>Дата</span>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </label>
          </div>
        )}

        {kind === 'expense' && (
          <>
            <label className={styles.field}>
              <span className={styles.label}>Категория</span>
              <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                <option value="">Без категории</option>
                {selectableCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.icon} {c.name}
                  </option>
                ))}
              </select>
            </label>
            {accountSelect('Со счёта', effectiveFrom, setFromId)}
          </>
        )}

        {kind === 'income' && accountSelect('На счёт', effectiveTo, setToId)}

        {kind === 'transfer' && (
          <>
            {accountSelect('Откуда', effectiveFrom, setFromId)}
            {accountSelect('Куда', toId, setToId)}
          </>
        )}

        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Комментарий"
          aria-label="Комментарий"
        />

        <details className={styles.details}>
          <summary>Бюджет: {budgetSummary}</summary>
          <div className={styles.detailsBody}>
            {kind === 'adjustment' && (
              <label className={styles.field}>
                <span className={styles.label}>Дата</span>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </label>
            )}
            <div className={styles.row}>
              <label className={styles.field}>
                <span className={styles.label}>Месяц</span>
                <select
                  value={budgetMonthId}
                  onChange={(e) => {
                    setMonthChoice(e.target.value);
                    setIncomeChoice(null);
                  }}
                >
                  <option value="">Вне бюджета</option>
                  {months.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name || `${getMonthName(m.month)} ${m.year}`}
                    </option>
                  ))}
                </select>
              </label>
              <label className={styles.field}>
                <span className={styles.label}>Из дохода</span>
                <select
                  value={incomeItemId}
                  onChange={(e) => setIncomeChoice(e.target.value)}
                  disabled={!budgetMonthId}
                >
                  <option value="">Не привязано</option>
                  {incomeItems.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>
        </details>

        {validationError && (amount !== '' || actualBalance !== '') && (
          <div className={styles.error}>{validationError}</div>
        )}

        <div className={styles.actions}>
          {isEdit && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={isBusy}
              className={styles.dangerBtn}
            >
              Удалить
            </button>
          )}
          <button
            type="submit"
            disabled={isBusy || validationError !== null}
            className={styles.primaryBtn}
          >
            {isBusy ? 'Сохранение...' : isEdit ? 'Сохранить' : 'Добавить'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
