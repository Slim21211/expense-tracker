import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useGetExpenseCategoriesQuery,
  useCreateExpenseCategoryMutation,
  useDeleteExpenseCategoryMutation,
} from '@/services/api';
import styles from './Categoriespage.module.scss';

const COMMON_ICONS = [
  '🏠',
  '🚗',
  '🍔',
  '🎮',
  '👕',
  '💊',
  '📱',
  '✈️',
  '🎬',
  '📚',
  '💳',
  '🎁',
  '🏃',
  '🍺',
  '🐕',
  '💅',
  '🔧',
  '⚡',
  '💡',
  '🌿',
  '🎨',
  '🎵',
  '🏥',
  '🚌',
];

export const CategoriesPage = () => {
  const navigate = useNavigate();
  const { data: categories = [], isLoading } = useGetExpenseCategoriesQuery();
  const [createCategory] = useCreateExpenseCategoryMutation();
  const [deleteCategory] = useDeleteExpenseCategoryMutation();

  const [isAdding, setIsAdding] = useState(false);
  const [newCategory, setNewCategory] = useState({ name: '', icon: '📦' });

  const handleCreate = async () => {
    if (newCategory.name.trim()) {
      await createCategory({
        name: newCategory.name.trim(),
        icon: newCategory.icon,
        type: 'variable',
        color: '#6366f1',
        sort_order: categories.length,
      });
      setNewCategory({ name: '', icon: '📦' });
      setIsAdding(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Удалить категорию?')) {
      await deleteCategory(id);
    }
  };

  if (isLoading) {
    return <div className={styles.loading}>Загрузка...</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button onClick={() => navigate(-1)} className={styles.backButton}>
          ← Назад
        </button>
        <h1 className={styles.title}>🏷️ Категории расходов</h1>
      </div>

      <div className={styles.content}>
        {isAdding && (
          <div className={styles.addForm}>
            <h3 className={styles.formTitle}>Новая категория</h3>

            <div className={styles.field}>
              <label className={styles.label}>Название</label>
              <input
                type="text"
                value={newCategory.name}
                onChange={(e) =>
                  setNewCategory({ ...newCategory, name: e.target.value })
                }
                placeholder="Например: Продукты, Транспорт"
                className={styles.input}
                autoFocus
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Иконка</label>
              <div className={styles.iconPicker}>
                {COMMON_ICONS.map((icon) => (
                  <button
                    key={icon}
                    onClick={() => setNewCategory({ ...newCategory, icon })}
                    className={`${styles.iconBtn} ${
                      newCategory.icon === icon ? styles.iconBtnActive : ''
                    }`}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.formActions}>
              <button onClick={handleCreate} className={styles.saveBtn}>
                Создать
              </button>
              <button
                onClick={() => setIsAdding(false)}
                className={styles.cancelBtn}
              >
                Отмена
              </button>
            </div>
          </div>
        )}

        {!isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className={styles.addButton}
          >
            + Добавить категорию
          </button>
        )}

        {/* Все категории одним списком */}
        <div className={styles.section}>
          <div className={styles.categoriesList}>
            {categories.length === 0 ? (
              <div className={styles.empty}>
                <p>Нет категорий</p>
                <p className={styles.emptyHint}>
                  Создайте категории для планирования расходов
                </p>
              </div>
            ) : (
              categories.map((category) => (
                <div key={category.id} className={styles.categoryCard}>
                  <div className={styles.categoryIcon}>{category.icon}</div>
                  <div className={styles.categoryName}>{category.name}</div>
                  {!category.is_system && (
                    <button
                      onClick={() => handleDelete(category.id)}
                      className={styles.deleteBtn}
                    >
                      🗑️
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
