import { type ReactNode, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  useGetAccountsQuery,
  useGetBudgetMonthByIdQuery,
  useGetBudgetMonthsQuery,
  useGetExpenseCategoriesQuery,
  useDeleteIncomeItemMutation,
  useCopyMonthPlansMutation,
} from '@/services/api';
import { Modal } from '@/components/Modal/Modal';
import { IncomePlanModal } from '@/components/IncomePlanModal/IncomePlanModal';
import { TransactionModal } from '@/components/TransactionModal/TransactionModal';
import { TransactionList } from '@/components/TransactionList/TransactionList';
import { Icon } from '@/components/Icon/Icon';
import type {
  AccountWithBalance,
  ExpenseCategory,
  ExpenseItem,
  IncomeItem,
  Transaction,
  TransactionDraft,
} from '@/types/database';
import { getMonthName, formatDate } from '@/utils/dateUtils';
import {
  accountKinds,
  budgetInflow,
  budgetOutflow,
  errorMessage,
  formatMoney,
} from '@/utils/ledger';
import { findPreviousMonth } from '@/utils/planCopy';
import styles from './MonthBudgetPage.module.scss';

type ActiveModal =
  | null
  | { type: 'plan'; income?: IncomeItem; plans?: ExpenseItem[] }
  | { type: 'transaction'; transaction?: Transaction; defaults?: Partial<TransactionDraft> }
  | { type: 'list'; title: string; transactions: Transaction[] };

interface BudgetRow {
  key: string;
  icon: ReactNode;
  name: string;
  planned: number;
  actual: number;
  transactions: Transaction[];
  unplanned: boolean;
}

interface Lookups {
  accountById: Map<string, AccountWithBalance>;
  categoryById: Map<string, ExpenseCategory>;
}

const rowKey = (accountId: string | null, categoryId: string | null) =>
  accountId ? `acc:${accountId}` : `cat:${categoryId ?? 'none'}`;

// Строки таблицы: сначала планы, затем траты вне плана.
// Перевод в копилку/кредит относится к строке счёта, расход — к строке категории.
function buildRows(plans: ExpenseItem[], outflows: Transaction[], lookups: Lookups) {
  const rows = new Map<string, BudgetRow>();

  const ensureRow = (key: string, unplanned: boolean) => {
    let row = rows.get(key);
    if (!row) {
      const [type, id] = key.split(':');
      const target =
        type === 'acc' ? lookups.accountById.get(id) : lookups.categoryById.get(id);
      row = {
        key,
        icon:
          type === 'adj' ? (
            <Icon name="adjust" size={16} />
          ) : (
            target?.icon ?? <Icon name="tag" size={16} />
          ),
        name: type === 'adj' ? 'Корректировка' : target?.name ?? 'Без категории',
        planned: 0,
        actual: 0,
        transactions: [],
        unplanned,
      };
      rows.set(key, row);
    }
    return row;
  };

  for (const plan of plans) {
    ensureRow(rowKey(plan.target_account_id, plan.category_id), false).planned +=
      plan.planned_amount;
  }

  for (const t of outflows) {
    const key =
      t.kind === 'adjustment'
        ? 'adj:'
        : rowKey(t.kind === 'transfer' ? t.to_account_id : null, t.category_id);
    const row = ensureRow(key, true);
    row.actual += t.amount;
    row.transactions.push(t);
  }

  return [...rows.values()];
}

export const MonthBudgetPage = () => {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data, isLoading, error } = useGetBudgetMonthByIdQuery(id, { skip: !id });
  const { data: months = [] } = useGetBudgetMonthsQuery();
  const { data: accounts = [] } = useGetAccountsQuery();
  const { data: categories = [] } = useGetExpenseCategoriesQuery();
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);
  const [copyMonthPlans, { isLoading: isCopying }] = useCopyMonthPlansMutation();

  if (isLoading) {
    return <div className={styles.loading}>Загрузка...</div>;
  }

  if (error || !data) {
    return (
      <div className={styles.loading}>
        <p>Не удалось загрузить месяц</p>
        <button onClick={() => navigate('/months')} className={styles.textBtn}>
          К списку месяцев
        </button>
      </div>
    );
  }

  const { month, income_items, expense_items, transactions } = data;
  const totals = months.find((m) => m.id === month.id);
  const monthName = month.name || `${getMonthName(month.month)} ${month.year}`;

  const kinds = accountKinds(accounts);
  const lookups: Lookups = {
    accountById: new Map(accounts.map((a) => [a.id, a])),
    categoryById: new Map(categories.map((c) => [c.id, c])),
  };

  const unassigned = transactions.filter((t) => !t.income_item_id);
  const sourceMonth = findPreviousMonth(months, month);

  const handleCopyPlans = async () => {
    if (!sourceMonth) return;
    try {
      await copyMonthPlans({ sourceMonthId: sourceMonth.id, targetMonthId: month.id }).unwrap();
    } catch (err) {
      alert(errorMessage(err));
    }
  };
  const openList = (title: string, list: Transaction[]) =>
    setActiveModal({ type: 'list', title, transactions: list });

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button
          onClick={() => navigate('/months')}
          className={styles.backBtn}
          aria-label="К списку месяцев"
        >
          <Icon name="back" size={20} />
        </button>
        <h1 className={styles.title}>{monthName}</h1>
        <button
          onClick={() => navigate(`/transactions?month=${month.id}`)}
          className={styles.textBtn}
        >
          Операции
        </button>
      </div>

      <section className={styles.summary}>
        <div className={styles.summaryMain}>
          <span className={styles.summaryLabel}>Остаток</span>
          <span
            className={`${styles.summaryValue} ${
              (totals?.remaining ?? 0) < 0 ? styles.negative : ''
            }`}
          >
            {formatMoney(totals?.remaining ?? 0)}
          </span>
        </div>
        <div className={styles.summaryStats}>
          <Stat label="Перенос" value={totals?.carry_over ?? 0} />
          <Stat
            label="Поступило"
            value={totals?.actual_income ?? 0}
            plan={totals?.planned_income}
          />
          <Stat
            label="Потрачено"
            value={totals?.actual_expenses ?? 0}
            plan={totals?.planned_expenses}
          />
        </div>
      </section>

      <div className={styles.incomesList}>
        {income_items.map((income) => {
          const own = transactions.filter((t) => t.income_item_id === income.id);
          const plans = expense_items.filter((p) => p.income_item_id === income.id);
          return (
            <IncomeCard
              key={income.id}
              income={income}
              plans={plans}
              inflows={own.filter((t) => budgetInflow(t, kinds) > 0)}
              outflows={own.filter((t) => budgetOutflow(t, kinds) > 0)}
              lookups={lookups}
              onEditPlan={() => setActiveModal({ type: 'plan', income, plans })}
              onAdd={(defaults) =>
                setActiveModal({
                  type: 'transaction',
                  defaults: { ...defaults, budget_month_id: month.id, income_item_id: income.id },
                })
              }
              onOpenList={openList}
            />
          );
        })}

        {income_items.length === 0 && (
          <div className={styles.empty}>
            <p>В этом месяце пока нет доходов</p>
            <p className={styles.muted}>Добавьте план дохода и распределите его по категориям</p>
            {sourceMonth && (
              <button
                onClick={handleCopyPlans}
                disabled={isCopying}
                className={styles.copyBtn}
              >
                {isCopying
                  ? 'Копирование...'
                  : `Скопировать план из «${
                      sourceMonth.name ||
                      `${getMonthName(sourceMonth.month)} ${sourceMonth.year}`
                    }»`}
              </button>
            )}
          </div>
        )}

        <button
          onClick={() => setActiveModal({ type: 'plan' })}
          className={styles.addIncomeBtn}
        >
          <Icon name="plus" size={18} />
          План дохода
        </button>

        {unassigned.length > 0 && (
          <section className={styles.card}>
            <h3 className={styles.cardTitle}>Без привязки к доходу</h3>
            <TransactionList
              transactions={unassigned}
              accounts={accounts}
              categories={categories}
              onSelect={(transaction) => setActiveModal({ type: 'transaction', transaction })}
            />
          </section>
        )}
      </div>

      {activeModal?.type === 'plan' && (
        <IncomePlanModal
          budgetMonthId={month.id}
          income={activeModal.income}
          plans={activeModal.plans}
          onClose={() => setActiveModal(null)}
        />
      )}

      {activeModal?.type === 'transaction' && (
        <TransactionModal
          transaction={activeModal.transaction}
          defaults={activeModal.defaults}
          onClose={() => setActiveModal(null)}
        />
      )}

      {activeModal?.type === 'list' && (
        <Modal isOpen={true} onClose={() => setActiveModal(null)} title={activeModal.title}>
          <TransactionList
            transactions={activeModal.transactions}
            accounts={accounts}
            categories={categories}
            showTotal
            onSelect={(transaction) => setActiveModal({ type: 'transaction', transaction })}
          />
        </Modal>
      )}
    </div>
  );
};

function Stat({ label, value, plan }: { label: string; value: number; plan?: number }) {
  return (
    <div className={styles.stat}>
      <span className={styles.statLabel}>{label}</span>
      <span className={styles.statValue}>{formatMoney(value)}</span>
      {plan !== undefined && <span className={styles.statPlan}>план {formatMoney(plan)}</span>}
    </div>
  );
}

interface IncomeCardProps {
  income: IncomeItem;
  plans: ExpenseItem[];
  inflows: Transaction[];
  outflows: Transaction[];
  lookups: Lookups;
  onEditPlan: () => void;
  onAdd: (defaults: Partial<TransactionDraft>) => void;
  onOpenList: (title: string, transactions: Transaction[]) => void;
}

function IncomeCard({
  income,
  plans,
  inflows,
  outflows,
  lookups,
  onEditPlan,
  onAdd,
  onOpenList,
}: IncomeCardProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [deleteIncome, { isLoading: isDeleting }] = useDeleteIncomeItemMutation();

  const rows = buildRows(plans, outflows, lookups);
  const totalActual = rows.reduce((sum, r) => sum + r.actual, 0);
  const actualIncome = inflows.reduce((sum, t) => sum + t.amount, 0);
  const left = actualIncome - totalActual;

  const handleDelete = async () => {
    if (!confirm(`Удалить доход «${income.name}» вместе с планом?`)) return;
    try {
      await deleteIncome(income.id).unwrap();
    } catch (error) {
      alert(errorMessage(error));
    }
  };

  return (
    <section className={styles.card}>
      <button className={styles.incomeHeader} onClick={() => setIsExpanded(!isExpanded)}>
        <Icon
          name={isExpanded ? 'chevronDown' : 'chevronRight'}
          size={18}
          className={styles.chevron}
        />
        <span className={styles.incomeTitle}>
          <span className={styles.cardTitle}>{income.name}</span>
          {income.planned_date && (
            <span className={styles.muted}>{formatDate(income.planned_date)}</span>
          )}
        </span>
        <span className={styles.incomeAmounts}>
          <span className={styles.amountStrong}>{formatMoney(actualIncome)}</span>
          <span className={styles.muted}>из {formatMoney(income.planned_amount)}</span>
        </span>
      </button>

      {isExpanded && (
        <>
          <div className={styles.actions}>
            <button onClick={() => onAdd({ kind: 'expense' })} className={styles.actionPrimary}>
              Расход
            </button>
            <button onClick={() => onAdd({ kind: 'income' })} className={styles.action}>
              Поступление
            </button>
            <button onClick={() => onAdd({ kind: 'transfer' })} className={styles.action}>
              Перевод
            </button>
            <button onClick={onEditPlan} className={styles.action}>
              План
            </button>
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className={styles.action}
              aria-label="Удалить доход"
            >
              <Icon name="trash" size={16} />
            </button>
          </div>

          {rows.length > 0 && (
            <ul className={styles.rows}>
              {rows.map((row) => {
                const over = row.actual > row.planned;
                const percent =
                  row.planned > 0 ? Math.min((row.actual / row.planned) * 100, 100) : 100;
                return (
                  <li key={row.key}>
                    <button
                      className={styles.row}
                      onClick={() => onOpenList(row.name, row.transactions)}
                    >
                      <span className={styles.rowIcon}>{row.icon}</span>
                      <span className={styles.rowBody}>
                        <span className={styles.rowLine}>
                          <span className={styles.rowName}>{row.name}</span>
                          <span className={styles.rowAmount}>{formatMoney(row.actual)}</span>
                        </span>
                        <span className={styles.progress}>
                          <span
                            className={`${styles.progressFill} ${
                              over ? styles.progressOver : ''
                            }`}
                            style={{ width: `${row.actual > 0 ? percent : 0}%` }}
                          />
                        </span>
                        <span className={styles.rowLine}>
                          <span className={styles.rowMeta}>
                            {row.unplanned ? 'вне плана' : `план ${formatMoney(row.planned)}`}
                          </span>
                          {!row.unplanned && (
                            <span
                              className={`${styles.rowMeta} ${over ? styles.negative : ''}`}
                            >
                              {over
                                ? `сверх плана ${formatMoney(row.actual - row.planned)}`
                                : `осталось ${formatMoney(row.planned - row.actual)}`}
                            </span>
                          )}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          <div className={styles.footer}>
            <button
              type="button"
              className={styles.footerItem}
              onClick={() => onOpenList(`Поступления: ${income.name}`, inflows)}
            >
              <span className={`${styles.footerLabel} ${styles.footerLink}`}>Поступило</span>
              <span className={styles.footerValue}>{formatMoney(actualIncome)}</span>
            </button>
            <div className={styles.footerItem}>
              <span className={styles.footerLabel}>Потрачено</span>
              <span className={styles.footerValue}>{formatMoney(totalActual)}</span>
            </div>
            <div className={styles.footerItem}>
              <span className={styles.footerLabel}>Осталось</span>
              <span
                className={`${styles.footerValue} ${styles.amountStrong} ${
                  left < 0 ? styles.negative : ''
                }`}
              >
                {formatMoney(left)}
              </span>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
