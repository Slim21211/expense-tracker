# 📋 TODO: Реализация нового флоу

## ✅ Готово

1. ✅ Исправлены все TypeScript ошибки
2. ✅ Добавлен роут `/categories`
3. ✅ Обновлены типы БД (database.ts)
4. ✅ Создана схема БД (schema-expense-tracking.sql)
5. ✅ Страница категорий (Categoriespage) работает

## 🔧 Нужно доделать

### Критично для работы:

1. **SQL миграция** - выполнить `schema-expense-tracking.sql` в Supabase
   
2. **API endpoints** - добавить в `src/services/api.ts`:
   - `createExpenseTransaction` - создание фактического расхода
   - `getExpenseTransactions` - получение расходов для дохода
   - `createIncomeDebt` - взятие в долг из копилки
   - `getIncomeDebts` - получение долгов для дохода
   - `addActualIncome` - добавление к фактическому доходу (плюсование)

3. **MonthBudgetPage** - полностью переписать:
   - Убрать таблицы для редактирования
   - Добавить модалки для всех действий
   - Реализовать плюсование вместо перезаписи
   - Добавить адаптив для мобилок

4. **MonthsListPage** - показывать реальные суммы из БД

### Структура модалок:

**AddIncomePlanModal.tsx** - добавление плана дохода
```typescript
- Название дохода
- Дата
- Плановая сумма
- Список планов расходов (динамический)
- Показывать "Не распределено"
```

**AddActualIncomeModal.tsx** - внесение факта дохода
```typescript
- Показать плановую сумму
- Поле для ввода суммы
- Плюсовать к existing actual_amount
```

**AddExpenseModal.tsx** - внесение расхода
```typescript
- Выбор категории (только планові)
- Сумма
- Описание
- Создает ExpenseTransaction
```

**TakeDebtModal.tsx** - взять в долг
```typescript
- Выбор копилки
- Сумма
- Создает IncomeDebt
```

### Пример кода для плюсования:

```typescript
// Добавление к фактическому доходу
const addActualIncome = async (incomeId: string, amount: number) => {
  const { data: current } = await supabase
    .from('income_items')
    .select('actual_amount')
    .eq('id', incomeId)
    .single();
  
  await supabase
    .from('income_items')
    .update({ 
      actual_amount: (current.actual_amount || 0) + amount,
      actual_date: new Date().toISOString()
    })
    .eq('id', incomeId);
};

// Создание транзакции расхода (суммируются автоматически в представлении)
const addExpense = async (incomeId: string, categoryId: string, amount: number) => {
  await supabase
    .from('expense_transactions')
    .insert({
      income_item_id: incomeId,
      category_id: categoryId,
      amount: amount,
      description: '...',
      transaction_date: new Date().toISOString()
    });
};
```

## 📱 Адаптив

Добавить media queries в SCSS:

```scss
// Мобилки
@media (max-width: 768px) {
  .modal {
    width: 95%;
    padding: var(--spacing-md);
  }
  
  .table {
    overflow-x: auto;
  }
  
  .buttonGroup {
    flex-direction: column;
    button {
      width: 100%;
    }
  }
}

// Планшеты
@media (min-width: 769px) and (max-width: 1024px) {
  .grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
```

## 🚀 Порядок действий

1. Выполнить SQL в Supabase (создать таблицы)
2. Добавить API endpoints
3. Создать модалки
4. Переписать MonthBudgetPage
5. Добавить адаптив
6. Протестировать на мобилке

---

**Важно:** Текущая версия имеет базовую структуру, но требует реализации модалок и правильной логики плюсования. Следуй архитектуре из `ARCHITECTURE.md`.
