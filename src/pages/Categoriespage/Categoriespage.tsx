import { FormEvent, useState } from 'react';
import {
  useGetExpenseCategoriesQuery,
  useCreateExpenseCategoryMutation,
  useUpdateExpenseCategoryMutation,
  useDeleteExpenseCategoryMutation,
} from '@/services/api';
import { Modal } from '@/components/Modal/Modal';
import { Icon } from '@/components/Icon/Icon';
import type { ExpenseCategory } from '@/types/database';
import { errorMessage } from '@/utils/ledger';
import form from '@/styles/form.module.scss';
import styles from './Categoriespage.module.scss';

const COMMON_ICONS = [
  '🍔', '🛒', '🏠', '🚗', '⛽', '🅿️', '🚌', '🎉', '👕', '💊', '📱', '🌐',
  '💳', '🎁', '🐱', '🐕', '💄', '🌸', '🚬', '✈️', '🎬', '📚', '🔧', '💡',
  '🏥', '🏃', '🍺', '☕', '🎮', '🌿', '📦',
];

const EMPTY_FORM = { name: '', icon: '📦' };

export const CategoriesPage = () => {
  const { data: categories = [], isLoading } = useGetExpenseCategoriesQuery();
  const [createCategory, { isLoading: isCreating }] = useCreateExpenseCategoryMutation();
  const [updateCategory, { isLoading: isUpdating }] = useUpdateExpenseCategoryMutation();
  const [deleteCategory] = useDeleteExpenseCategoryMutation();

  // null — форма закрыта, { id: undefined } — новая категория
  const [editing, setEditing] = useState<null | { id?: string; name: string; icon: string }>(
    null
  );
  const [showArchived, setShowArchived] = useState(false);

  const active = categories.filter((c) => !c.is_archived);
  const archived = categories.filter((c) => c.is_archived);

  const run = async (action: () => Promise<unknown>) => {
    try {
      await action();
      return true;
    } catch (error) {
      alert(errorMessage(error));
      return false;
    }
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    const name = editing.name.trim();
    if (!name) return;
    const ok = await run(() =>
      editing.id
        ? updateCategory({ id: editing.id, name, icon: editing.icon }).unwrap()
        : createCategory({
            name,
            icon: editing.icon,
            type: 'variable',
            color: '#6366f1',
            sort_order: categories.length,
          }).unwrap()
    );
    if (ok) setEditing(null);
  };

  const toggleArchive = (category: ExpenseCategory) =>
    run(() =>
      updateCategory({ id: category.id, is_archived: !category.is_archived }).unwrap()
    );

  const handleDelete = async (id: string) => {
    if (
      confirm(
        'Удалить категорию? Если по ней есть операции, удалить не получится — используйте архив.'
      )
    ) {
      const ok = await run(() => deleteCategory(id).unwrap());
      if (ok) setEditing(null);
    }
  };

  if (isLoading) {
    return <div className={styles.loading}>Загрузка...</div>;
  }

  const renderItem = (category: ExpenseCategory) => (
    <button
      key={category.id}
      className={styles.item}
      onClick={() =>
        !category.is_system &&
        setEditing({ id: category.id, name: category.name, icon: category.icon })
      }
    >
      <span className={styles.icon}>{category.icon}</span>
      <span className={styles.name}>{category.name}</span>
      {!category.is_system && (
        <Icon name="chevronRight" size={18} className={styles.chevron} />
      )}
    </button>
  );

  const editedCategory = categories.find((c) => c.id === editing?.id);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Категории</h1>
        <button onClick={() => setEditing({ ...EMPTY_FORM })} className={styles.addBtn}>
          <Icon name="plus" size={16} />
          Категория
        </button>
      </div>

      <div className={styles.card}>
        {active.length === 0 ? (
          <p className={styles.empty}>Нет категорий</p>
        ) : (
          active.map(renderItem)
        )}
      </div>

      {archived.length > 0 && (
        <>
          <button onClick={() => setShowArchived(!showArchived)} className={styles.linkBtn}>
            {showArchived ? 'Скрыть архив' : `Архив (${archived.length})`}
          </button>
          {showArchived && (
            <div className={`${styles.card} ${styles.archived}`}>
              {archived.map(renderItem)}
            </div>
          )}
        </>
      )}

      {editing && (
        <Modal
          isOpen={true}
          onClose={() => setEditing(null)}
          title={editing.id ? 'Категория' : 'Новая категория'}
        >
          <form onSubmit={handleSave} className={form.form}>
            <label className={form.field}>
              <span className={form.label}>Название</span>
              <input
                type="text"
                value={editing.name}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                placeholder="Продукты, Транспорт..."
                autoFocus={!editing.id}
              />
            </label>

            <div className={form.field}>
              <span className={form.label}>Иконка</span>
              <div className={form.pickerRow}>
                {COMMON_ICONS.map((icon) => (
                  <button
                    key={icon}
                    type="button"
                    onClick={() => setEditing({ ...editing, icon })}
                    className={`${form.pickerBtn} ${
                      editing.icon === icon ? form.pickerBtnActive : ''
                    }`}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>

            <div className={form.actions}>
              {editedCategory && (
                <button
                  type="button"
                  onClick={async () => {
                    if (await toggleArchive(editedCategory)) setEditing(null);
                  }}
                  className={form.secondaryBtn}
                >
                  {editedCategory.is_archived ? 'Из архива' : 'В архив'}
                </button>
              )}
              <button
                type="submit"
                disabled={isCreating || isUpdating || !editing.name.trim()}
                className={form.primaryBtn}
              >
                {editing.id ? 'Сохранить' : 'Создать'}
              </button>
            </div>

            {editedCategory && (
              <button
                type="button"
                onClick={() => handleDelete(editedCategory.id)}
                className={styles.deleteLink}
              >
                Удалить категорию
              </button>
            )}
          </form>
        </Modal>
      )}
    </div>
  );
};
