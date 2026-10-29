import { FormEvent, useState } from 'react';
import { Modal } from '@/components/Modal/Modal';
import { AmountInput } from '@/components/AmountInput/AmountInput';
import {
  useGetAccountsQuery,
  useGetBudgetMonthsQuery,
  useGetExpenseCategoriesQuery,
  useGetRecentIncomePlansQuery,
  useSaveIncomePlanMutation,
} from '@/services/api';
import { Icon } from '@/components/Icon/Icon';
import type { ExpenseItem, IncomeItem } from '@/types/database';
import { getMonthName } from '@/utils/dateUtils';
import { amountToInput, errorMessage, formatMoney, parseAmount } from '@/utils/ledger';
import { monthDelta, shiftDate, shiftMonthNames } from '@/utils/planCopy';
import styles from '@/styles/form.module.scss';

interface Props {
  onClose: () => void;
  budgetMonthId: string;
  income?: IncomeItem; // редактирование
  plans?: ExpenseItem[];
}

interface PlanRow {
  key: string;
  id?: string;
  target: string; // 'cat:<id>' | 'acc:<id>'
  amount: string;
}

const planTarget = (p: ExpenseItem) =>
  p.target_account_id ? `acc:${p.target_account_id}` : `cat:${p.category_id}`;

export const IncomePlanModal = ({
  onClose,
  budgetMonthId,
  income,
  plans = [],
}: Props) => {
  const { data: categories = [] } = useGetExpenseCategoriesQuery();
  const { data: accounts = [] } = useGetAccountsQuery();
  const [saveIncomePlan, { isLoading }] = useSaveIncomePlanMutation();
  const { data: months = [] } = useGetBudgetMonthsQuery();
  // Источники для «Заполнить из…» нужны только при создании нового дохода
  const { data: sources = [] } = useGetRecentIncomePlansQuery(undefined, { skip: !!income });
  const targetMonth = months.find((m) => m.id === budgetMonthId);

  const [name, setName] = useState(income?.name ?? '');
  const [plannedAmount, setPlannedAmount] = useState(
    amountToInput(income?.planned_amount)
  );
  const [plannedDate, setPlannedDate] = useState(income?.planned_date ?? '');
  const [rows, setRows] = useState<PlanRow[]>(
    plans.map((p) => ({
      key: p.id,
      id: p.id,
      target: planTarget(p),
      amount: amountToInput(p.planned_amount),
    }))
  );
  const [removedPlanIds, setRemovedPlanIds] = useState<string[]>([]);

  const selectedTargets = new Set(rows.map((r) => r.target));
  const selectableCategories = categories.filter(
    (c) => !c.is_archived || selectedTargets.has(`cat:${c.id}`)
  );
  const selectableAccounts = accounts.filter(
    (a) =>
      a.kind !== 'regular' &&
      (!a.is_archived || selectedTargets.has(`acc:${a.id}`))
  );

  const totalPlanned = rows.reduce((sum, r) => sum + (parseAmount(r.amount) || 0), 0);
  const unallocated = (parseAmount(plannedAmount) || 0) - totalPlanned;

  const updateRow = (key: string, field: 'target' | 'amount', value: string) =>
    setRows(rows.map((r) => (r.key === key ? { ...r, [field]: value } : r)));

  const removeRow = (row: PlanRow) => {
    if (row.id) setRemovedPlanIds([...removedPlanIds, row.id]);
    setRows(rows.filter((r) => r.key !== row.key));
  };

  // Заполняет форму планом прошлого дохода; сохраняется только по кнопке
  const fillFrom = (sourceId: string) => {
    const source = sources.find((s) => s.id === sourceId);
    if (!source) return;
    const delta = targetMonth ? monthDelta(source.month, targetMonth) : 0;
    setName(shiftMonthNames(source.name, delta));
    setPlannedAmount(amountToInput(source.planned_amount));
    setPlannedDate(shiftDate(source.planned_date, delta) ?? '');
    setRows(
      source.plans.map((p) => ({
        key: crypto.randomUUID(),
        target: planTarget(p),
        amount: amountToInput(Number(p.planned_amount)),
      }))
    );
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      await saveIncomePlan({
        income: {
          id: income?.id,
          budget_month_id: budgetMonthId,
          name: name.trim(),
          planned_amount: parseAmount(plannedAmount) || 0,
          planned_date: plannedDate || null,
        },
        plans: rows
          .filter((r) => r.target)
          .map((r) => {
            const [type, id] = r.target.split(':');
            return {
              id: r.id,
              category_id: type === 'cat' ? id : null,
              target_account_id: type === 'acc' ? id : null,
              planned_amount: parseAmount(r.amount) || 0,
            };
          }),
        removedPlanIds,
      }).unwrap();
      onClose();
    } catch (error) {
      alert(errorMessage(error));
    }
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={income ? 'Редактировать план дохода' : 'Новый план дохода'}
    >
      <form onSubmit={handleSubmit} className={styles.form}>
        {!income && sources.length > 0 && (
          <label className={styles.field}>
            <span className={styles.label}>Заполнить из прошлого дохода</span>
            <select defaultValue="" onChange={(e) => fillFrom(e.target.value)}>
              <option value="" disabled>
                Выберите доход
              </option>
              {sources.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} · {s.month.name || `${getMonthName(s.month.month)} ${s.month.year}`}
                </option>
              ))}
            </select>
          </label>
        )}

        <label className={styles.field}>
          <span className={styles.label}>Название дохода</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Аванс, Зарплата..."
            autoFocus={!income}
          />
        </label>

        <div className={styles.row}>
          <label className={styles.field}>
            <span className={styles.label}>Плановая сумма</span>
            <AmountInput value={plannedAmount} onChange={setPlannedAmount} />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>Дата</span>
            <input
              type="date"
              value={plannedDate}
              onChange={(e) => setPlannedDate(e.target.value)}
            />
          </label>
        </div>

        <h4 className={styles.sectionTitle}>План расходов</h4>

        {rows.map((row) => (
          <div key={row.key} className={styles.planRow}>
            <select
              value={row.target}
              onChange={(e) => updateRow(row.key, 'target', e.target.value)}
              aria-label="Категория"
            >
              <option value="">Категория</option>
              <optgroup label="Категории">
                {selectableCategories.map((c) => (
                  <option key={c.id} value={`cat:${c.id}`}>
                    {c.icon} {c.name}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Перевод в копилку / кредит">
                {selectableAccounts.map((a) => (
                  <option key={a.id} value={`acc:${a.id}`}>
                    {a.icon} {a.name}
                  </option>
                ))}
              </optgroup>
            </select>
            <AmountInput
              value={row.amount}
              onChange={(value) => updateRow(row.key, 'amount', value)}
              aria-label="Сумма"
            />
            <button
              type="button"
              onClick={() => removeRow(row)}
              className={styles.iconBtn}
              aria-label="Убрать из плана"
            >
              <Icon name="close" size={18} />
            </button>
          </div>
        ))}

        <button
          type="button"
          onClick={() =>
            setRows([...rows, { key: crypto.randomUUID(), target: '', amount: '' }])
          }
          className={styles.linkBtn}
        >
          <Icon name="plus" size={16} />
          Добавить строку
        </button>

        {plannedAmount && (
          <div className={styles.summaryLine}>
            <span>Не распределено</span>
            <strong className={unallocated < 0 ? styles.negative : ''}>
              {formatMoney(unallocated)}
            </strong>
          </div>
        )}

        {removedPlanIds.length > 0 && (
          <span className={styles.hint}>
            Удаление строки плана не удаляет операции — они останутся «вне плана»
          </span>
        )}

        <div className={styles.actions}>
          <button
            type="submit"
            disabled={isLoading || !name.trim()}
            className={styles.primaryBtn}
          >
            {isLoading ? 'Сохранение...' : 'Сохранить'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
