import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  useGetBudgetMonthByIdQuery,
  useGetExpenseCategoriesQuery,
} from '@/services/api';
import { getMonthName, formatDate } from '@/utils/dateUtils';
import {
  AddIncomePlanModal,
  EditIncomePlanModal,
  AddActualIncomeModal,
  AddExpenseModal,
  TakeDebtModal,
} from '@/components/BudgetModals';
import type { IncomeItem, ExpenseItem } from '@/types/database';
import { ExpenseTransactionsModal } from '@/components/Expensetransactionsmodal/Expensetransactionsmodal';
import styles from './MonthBudgetPage.module.scss';

export const MonthBudgetPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  if (!id) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <h2>Ошибка</h2>
          <p>Месяц не найден</p>
          <button
            onClick={() => navigate('/months')}
            className={styles.backBtn}
          >
            ← Вернуться к списку
          </button>
        </div>
      </div>
    );
  }

  const { data: month, isLoading, error } = useGetBudgetMonthByIdQuery(id);
  const { data: categories = [] } = useGetExpenseCategoriesQuery();

  const [activeModal, setActiveModal] = useState<
    | null
    | { type: 'addPlan' }
    | { type: 'editPlan'; income: IncomeItem; plans: ExpenseItem[] }
    | { type: 'addIncome'; income: IncomeItem }
    | { type: 'addExpense'; income: IncomeItem; plans: ExpenseItem[] }
    | { type: 'takeDebt'; income: IncomeItem }
    | {
        type: 'viewTransactions';
        plan: ExpenseItem;
        category: any;
        transactions: any[];
      }
  >(null);

  if (isLoading) {
    return <div className={styles.loading}>Загрузка...</div>;
  }

  if (error || !month) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <h2>Ошибка загрузки</h2>
          <p>Не удалось загрузить данные месяца</p>
          <button
            onClick={() => navigate('/months')}
            className={styles.backBtn}
          >
            ← Вернуться к списку
          </button>
        </div>
      </div>
    );
  }

  const monthName = month.name || `${getMonthName(month.month)} ${month.year}`;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button onClick={() => navigate('/months')} className={styles.backBtn}>
          ← Назад
        </button>
        <h1 className={styles.title}>{monthName}</h1>
        <button
          onClick={() => setActiveModal({ type: 'addPlan' })}
          className={styles.addBtn}
        >
          + Добавить план дохода
        </button>
      </div>

      {/* Список доходов */}
      <div className={styles.incomesList}>
        {!month.income_items || month.income_items.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>📊</div>
            <h3>Нет доходов</h3>
            <p>Начните с создания плана дохода</p>
          </div>
        ) : (
          month.income_items.map((income: any) => {
            const plans =
              month.expense_items?.filter(
                (e: ExpenseItem) => e.name === income.id
              ) || [];
            const transactions = income.expense_transactions || [];

            return (
              <IncomeCard
                key={income.id}
                income={income}
                plans={plans}
                transactions={transactions}
                categories={categories}
                onEditPlan={() =>
                  setActiveModal({ type: 'editPlan', income, plans })
                }
                onAddIncome={() =>
                  setActiveModal({ type: 'addIncome', income })
                }
                onAddExpense={() =>
                  setActiveModal({ type: 'addExpense', income, plans })
                }
                onTakeDebt={() => setActiveModal({ type: 'takeDebt', income })}
                onViewTransactions={(
                  plan: ExpenseItem,
                  category: any,
                  categoryTransactions: any[]
                ) =>
                  setActiveModal({
                    type: 'viewTransactions',
                    plan,
                    category,
                    transactions: categoryTransactions,
                  })
                }
              />
            );
          })
        )}
      </div>

      {/* Итоги внизу страницы */}
      <div className={styles.summary}>
        <h2 className={styles.summaryTitle}>Итоги</h2>
        <div className={styles.summaryGrid}>
          <div className={styles.summaryCard}>
            <div className={styles.summaryLabel}>Доход (план)</div>
            <div className={styles.summaryValue}>
              {month.total_planned_income?.toLocaleString('ru-RU') || 0} ₽
            </div>
          </div>
          <div className={styles.summaryCard}>
            <div className={styles.summaryLabel}>Доход (факт)</div>
            <div className={styles.summaryValue}>
              {month.total_actual_income?.toLocaleString('ru-RU') || 0} ₽
            </div>
          </div>
          <div className={styles.summaryCard}>
            <div className={styles.summaryLabel}>Расходы (план)</div>
            <div className={styles.summaryValue}>
              {month.total_planned_expenses?.toLocaleString('ru-RU') || 0} ₽
            </div>
          </div>
          <div className={styles.summaryCard}>
            <div className={styles.summaryLabel}>Расходы (факт)</div>
            <div className={styles.summaryValue}>
              {month.total_actual_expenses?.toLocaleString('ru-RU') || 0} ₽
            </div>
          </div>
          <div className={`${styles.summaryCard} ${styles.summaryCardBalance}`}>
            <div className={styles.summaryLabel}>Остаток</div>
            <div className={styles.summaryValue}>
              {month.remaining_budget?.toLocaleString('ru-RU') || 0} ₽
            </div>
          </div>
        </div>
      </div>

      {/* Модалки */}
      {activeModal?.type === 'addPlan' && (
        <AddIncomePlanModal
          isOpen={true}
          onClose={() => setActiveModal(null)}
          budgetMonthId={month.id}
        />
      )}

      {activeModal?.type === 'editPlan' && (
        <EditIncomePlanModal
          isOpen={true}
          onClose={() => setActiveModal(null)}
          income={activeModal.income}
          currentPlans={activeModal.plans}
        />
      )}

      {activeModal?.type === 'addIncome' && (
        <AddActualIncomeModal
          isOpen={true}
          onClose={() => setActiveModal(null)}
          incomeItemId={activeModal.income.id}
          incomeName={activeModal.income.name}
          plannedAmount={activeModal.income.planned_amount}
          currentActualAmount={activeModal.income.actual_amount || 0}
        />
      )}

      {activeModal?.type === 'addExpense' && (
        <AddExpenseModal
          isOpen={true}
          onClose={() => setActiveModal(null)}
          incomeItemId={activeModal.income.id}
          incomeName={activeModal.income.name}
          plannedCategories={activeModal.plans.map((p) => ({
            category_id: p.category_id,
            category: categories.find((c) => c.id === p.category_id)!,
          }))}
        />
      )}

      {activeModal?.type === 'takeDebt' && (
        <TakeDebtModal
          isOpen={true}
          onClose={() => setActiveModal(null)}
          incomeItemId={activeModal.income.id}
          incomeName={activeModal.income.name}
        />
      )}

      {activeModal?.type === 'viewTransactions' && (
        <ExpenseTransactionsModal
          isOpen={true}
          onClose={() => setActiveModal(null)}
          categoryName={activeModal.category.name}
          categoryIcon={activeModal.category.icon}
          transactions={activeModal.transactions}
        />
      )}
    </div>
  );
};

// Карточка дохода
function IncomeCard({
  income,
  plans,
  transactions,
  categories,
  onEditPlan,
  onAddIncome,
  onAddExpense,
  onTakeDebt,
  onViewTransactions,
}: any) {
  const [isExpanded, setIsExpanded] = useState(true);

  const totalPlanned = plans.reduce(
    (sum: number, p: ExpenseItem) => sum + p.planned_amount,
    0
  );

  // Подсчитываем фактические расходы из переданных транзакций
  const totalActual = transactions.reduce(
    (sum: number, t: any) => sum + (t.amount || 0),
    0
  );

  const remainingPlan = income.planned_amount - totalPlanned;
  const remainingActual = (income.actual_amount || 0) - totalActual;

  return (
    <div className={styles.incomeCard}>
      <div className={styles.incomeHeader}>
        <div className={styles.incomeInfo}>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className={styles.expandBtn}
          >
            {isExpanded ? '▼' : '▶'}
          </button>
          <div>
            <h3 className={styles.incomeName}>{income.name}</h3>
            {income.planned_date && (
              <span className={styles.incomeDate}>
                {formatDate(income.planned_date)}
              </span>
            )}
          </div>
        </div>
        <div className={styles.incomeAmounts}>
          <div className={styles.amountCard}>
            <span className={styles.amountLabel}>План</span>
            <span className={styles.amountValue}>
              {income.planned_amount.toLocaleString('ru-RU')} ₽
            </span>
          </div>
          <div className={styles.amountCard}>
            <span className={styles.amountLabel}>Факт</span>
            <span className={styles.amountValue}>
              {(income.actual_amount || 0).toLocaleString('ru-RU')} ₽
            </span>
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className={styles.incomeContent}>
          <div className={styles.actions}>
            <button onClick={onEditPlan} className={styles.actionBtn}>
              ✏️ Редактировать план
            </button>
            <button onClick={onAddIncome} className={styles.actionBtn}>
              💰 Внести доход
            </button>
            <button onClick={onAddExpense} className={styles.actionBtn}>
              🛒 Добавить расход
            </button>
            <button onClick={onTakeDebt} className={styles.actionBtn}>
              🏦 Взять в долг
            </button>
          </div>

          {/* Таблица расходов (read-only) */}
          {plans.length > 0 && (
            <div className={styles.expensesTable}>
              <h4 className={styles.tableTitle}>Расходы</h4>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Категория</th>
                    <th>План</th>
                    <th>Факт</th>
                    <th>Разница</th>
                  </tr>
                </thead>
                <tbody>
                  {plans.map((plan: ExpenseItem) => {
                    const category = categories.find(
                      (c: any) => c.id === plan.category_id
                    );

                    // Суммируем транзакции по этой категории
                    const categoryTransactions = transactions.filter(
                      (t: any) => t.category_id === plan.category_id
                    );
                    const actual = categoryTransactions.reduce(
                      (sum: number, t: any) => sum + (t.amount || 0),
                      0
                    );

                    const diff = actual - plan.planned_amount;

                    return (
                      <tr
                        key={plan.id}
                        onClick={() =>
                          onViewTransactions(
                            plan,
                            category,
                            categoryTransactions
                          )
                        }
                        style={{ cursor: 'pointer' }}
                        title="Нажмите для просмотра транзакций"
                      >
                        <td>
                          {category?.icon} {category?.name}
                        </td>
                        <td>{plan.planned_amount.toLocaleString('ru-RU')} ₽</td>
                        <td>{actual.toLocaleString('ru-RU')} ₽</td>
                        <td
                          className={
                            diff < 0
                              ? styles.positive
                              : diff > 0
                              ? styles.negative
                              : ''
                          }
                        >
                          {diff !== 0 &&
                            `${diff <= 0 ? '+' : ''}${Math.abs(
                              diff
                            ).toLocaleString('ru-RU')} ₽`}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr>
                    <td>
                      <strong>ИТОГО</strong>
                    </td>
                    <td>
                      <strong>{totalPlanned.toLocaleString('ru-RU')} ₽</strong>
                    </td>
                    <td>
                      <strong>{totalActual.toLocaleString('ru-RU')} ₽</strong>
                    </td>
                    <td></td>
                  </tr>
                  <tr>
                    <td>
                      <strong>ОСТАТОК</strong>
                    </td>
                    <td>
                      <strong>{remainingPlan.toLocaleString('ru-RU')} ₽</strong>
                    </td>
                    <td>
                      <strong>
                        {remainingActual.toLocaleString('ru-RU')} ₽
                      </strong>
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
