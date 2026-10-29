import { FormEvent, useMemo, useState } from 'react';
import { Modal } from '@/components/Modal/Modal';
import { AmountInput } from '@/components/AmountInput/AmountInput';
import {
  useCreateTransactionMutation,
  useGetAccountsQuery,
  useGetExpenseCategoriesQuery,
  useGetTransactionsQuery,
} from '@/services/api';
import { useBudgetContext } from '@/hooks/useBudgetContext';
import { Icon } from '@/components/Icon/Icon';
import type { Transaction } from '@/types/database';
import { formatDate, todayISO } from '@/utils/dateUtils';
import { errorMessage, formatMoney, parseAmount } from '@/utils/ledger';
import form from '@/styles/form.module.scss';
import styles from './QuickExpense.module.scss';

interface Props {
  onClose: () => void;
  onSaved: (transaction: Transaction, label: string) => void;
  onMore: () => void; // полная форма: доход, перевод, корректировка
}

// 7 частых + «Все» — ровно два ряда по 4 на телефоне
const TOP_CATEGORIES = 7;

export const QuickExpense = ({ onClose, onSaved, onMore }: Props) => {
  const { data: accounts = [] } = useGetAccountsQuery();
  const { data: categories = [] } = useGetExpenseCategoriesQuery();
  const { data: recent = [] } = useGetTransactionsQuery({ limit: 300 });
  const budget = useBudgetContext();
  const [createTransaction, { isLoading }] = useCreateTransactionMutation();

  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [description, setDescription] = useState('');
  const [accountId, setAccountId] = useState('');
  const [date, setDate] = useState(todayISO());
  // null — ещё не трогали, берём доход по умолчанию
  const [incomeItemId, setIncomeItemId] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  const spendAccounts = accounts.filter((a) => !a.is_archived && a.track_balance);
  const effectiveAccountId =
    accountId || spendAccounts.find((a) => a.kind === 'regular')?.id || '';
  const effectiveIncomeId = incomeItemId ?? budget.defaultIncomeId ?? '';

  // Частые категории — первыми
  const sortedCategories = useMemo(() => {
    const usage = new Map<string, number>();
    for (const t of recent) {
      if (t.kind === 'expense' && t.category_id) {
        usage.set(t.category_id, (usage.get(t.category_id) ?? 0) + 1);
      }
    }
    return categories
      .filter((c) => !c.is_archived)
      .sort(
        (a, b) =>
          (usage.get(b.id) ?? 0) - (usage.get(a.id) ?? 0) || a.sort_order - b.sort_order
      );
  }, [categories, recent]);

  const visibleCategories = showAll
    ? sortedCategories
    : sortedCategories.slice(0, TOP_CATEGORIES);
  // Выбранная категория видна, даже если она не в топе
  if (!showAll && categoryId && !visibleCategories.some((c) => c.id === categoryId)) {
    const selected = sortedCategories.find((c) => c.id === categoryId);
    if (selected) visibleCategories.push(selected);
  }

  const value = parseAmount(amount);
  const canSave = value > 0 && Boolean(categoryId) && Boolean(effectiveAccountId);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!canSave || isLoading) return;

    try {
      const transaction = await createTransaction({
        kind: 'expense',
        amount: value,
        from_account_id: effectiveAccountId,
        to_account_id: null,
        category_id: categoryId,
        budget_month_id: budget.monthId,
        income_item_id: effectiveIncomeId || null,
        date,
        description: description.trim() || null,
        purpose: null,
      }).unwrap();

      const category = categories.find((c) => c.id === categoryId);
      onSaved(transaction, `${category?.icon ?? ''} ${category?.name ?? ''} · ${formatMoney(value)}`);
    } catch (error) {
      alert(errorMessage(error));
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="Новый расход">
      <form onSubmit={handleSubmit} className={styles.form}>
        <label className={styles.amount}>
          <AmountInput
            value={amount}
            onChange={setAmount}
            className={styles.amountInput}
            size={Math.max(amount.length, 1)}
            autoFocus
            enterKeyHint="next"
            aria-label="Сумма"
          />
          <span className={styles.currency}>₽</span>
        </label>

        <div className={styles.categories}>
          {visibleCategories.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCategoryId(c.id)}
              className={`${styles.category} ${
                c.id === categoryId ? styles.categoryActive : ''
              }`}
            >
              <span className={styles.categoryIcon}>{c.icon}</span>
              <span className={styles.categoryName}>{c.name}</span>
            </button>
          ))}
          {sortedCategories.length > TOP_CATEGORIES && (
            <button
              type="button"
              onClick={() => setShowAll(!showAll)}
              className={styles.category}
            >
              <span className={styles.categoryIcon}>
                <Icon name={showAll ? 'chevronUp' : 'more'} size={22} />
              </span>
              <span className={styles.categoryName}>{showAll ? 'Свернуть' : 'Все'}</span>
            </button>
          )}
        </div>

        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Комментарий"
          enterKeyHint="done"
        />

        <div className={styles.chips}>
          <label className={styles.chip}>
            <Icon name="calendar" size={16} />
            <span>{date === todayISO() ? 'Сегодня' : formatDate(date)}</span>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value || todayISO())}
              className={styles.chipControl}
            />
          </label>
          <label className={styles.chip}>
            <Icon name="wallet" size={16} />
            <span>
              {spendAccounts.find((a) => a.id === effectiveAccountId)?.name ?? 'Счёт'}
            </span>
            <select
              value={effectiveAccountId}
              onChange={(e) => setAccountId(e.target.value)}
              className={styles.chipControl}
            >
              {spendAccounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.icon} {a.name}
                </option>
              ))}
            </select>
          </label>
          {budget.incomeItems.length > 0 && (
            <label className={styles.chip}>
              <Icon name="income" size={16} />
              <span>
                {budget.incomeItems.find((i) => i.id === effectiveIncomeId)?.name ??
                  'Без дохода'}
              </span>
              <select
                value={effectiveIncomeId}
                onChange={(e) => setIncomeItemId(e.target.value)}
                className={styles.chipControl}
              >
                <option value="">Без привязки к доходу</option>
                {budget.incomeItems.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>

        <button type="submit" disabled={!canSave || isLoading} className={form.primaryBtn}>
          {isLoading
            ? 'Сохранение...'
            : !categoryId && value > 0
            ? 'Выберите категорию'
            : value > 0
            ? `Сохранить · ${formatMoney(value)}`
            : 'Сохранить'}
        </button>

        <button type="button" onClick={onMore} className={styles.more}>
          Доход, перевод или корректировка
          <Icon name="chevronRight" size={16} />
        </button>
      </form>
    </Modal>
  );
};
