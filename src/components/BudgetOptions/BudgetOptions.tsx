import type { BudgetGroup, BudgetValue } from '@/hooks/useBudgetChoices';
import { incomeValue, monthValue } from '@/hooks/useBudgetChoices';
import { formatDate } from '@/utils/dateUtils';

interface Props {
  groups: BudgetGroup[];
  value: BudgetValue;
  label: string; // подпись текущего значения, если его нет в списке
}

// Варианты <select> для привязки к бюджету: доходы, сгруппированные по месяцам.
// Месяц без дохода предлагается, только если доходов в нём нет
// или операция уже так привязана
export const BudgetOptions = ({ groups, value, label }: Props) => {
  const known =
    value === '' ||
    groups.some(
      (g) => value === monthValue(g.monthId) || g.incomes.some((i) => value === incomeValue(i.id))
    );

  return (
    <>
      <option value="">Вне бюджета</option>
      {!known && <option value={value}>{label}</option>}
      {groups.map((g) => (
        <optgroup key={g.monthId} label={g.label}>
          {g.incomes.map((i) => {
            const date = i.received_date ?? i.planned_date;
            return (
              <option key={i.id} value={incomeValue(i.id)}>
                {i.name}
                {date ? ` · ${formatDate(date)}` : ''}
              </option>
            );
          })}
          {(g.incomes.length === 0 || value === monthValue(g.monthId)) && (
            <option value={monthValue(g.monthId)}>{g.label} · без дохода</option>
          )}
        </optgroup>
      ))}
    </>
  );
};
