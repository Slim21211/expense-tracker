import { useState } from 'react';
import { useCreateCreditMutation } from '@/services/api';
import { Modal } from '@/components/Modal/Modal';
import styles from './Createcreditmodal.module.scss';

interface CreateCreditModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PRESET_ICONS = ['💳', '🏦', '🏠', '🚗', '📱', '🛒', '💰', '📊'];
const PRESET_COLORS = [
  '#ef4444', // red
  '#f97316', // orange
  '#f59e0b', // amber
  '#dc2626', // dark red
  '#991b1b', // darker red
];

export const CreateCreditModal = ({
  isOpen,
  onClose,
}: CreateCreditModalProps) => {
  const [createCredit, { isLoading }] = useCreateCreditMutation();
  const [formData, setFormData] = useState({
    name: '',
    target_amount: '',
    paid_amount: '0',
    icon: '💳',
    color: '#ef4444',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      alert('Введите название кредита');
      return;
    }

    const targetAmount = parseFloat(formData.target_amount);
    if (isNaN(targetAmount) || targetAmount <= 0) {
      alert('Введите корректную сумму кредита');
      return;
    }

    const paidAmount = parseFloat(formData.paid_amount) || 0;
    if (paidAmount < 0 || paidAmount > targetAmount) {
      alert('Погашенная сумма должна быть от 0 до суммы кредита');
      return;
    }

    try {
      await createCredit({
        name: formData.name.trim(),
        target_amount: targetAmount,
        paid_amount: paidAmount,
        icon: formData.icon,
        color: formData.color,
        is_archived: false,
      }).unwrap();

      setFormData({
        name: '',
        target_amount: '',
        paid_amount: '0',
        icon: '💳',
        color: '#ef4444',
      });
      onClose();
    } catch (error) {
      console.error('Failed to create credit:', error);
      alert('Ошибка при создании кредита');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Добавить кредит">
      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.field}>
          <label className={styles.label}>Название</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className={styles.input}
            placeholder="Ипотека"
            required
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Сумма кредита (₽)</label>
          <input
            type="number"
            step="0.01"
            value={formData.target_amount}
            onChange={(e) =>
              setFormData({ ...formData, target_amount: e.target.value })
            }
            className={styles.input}
            placeholder="5000000"
            min="0"
            required
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Уже погашено (₽)</label>
          <input
            type="number"
            step="0.01"
            value={formData.paid_amount}
            onChange={(e) =>
              setFormData({ ...formData, paid_amount: e.target.value })
            }
            className={styles.input}
            placeholder="0"
            min="0"
          />
          <span className={styles.hint}>
            Оставьте 0, если только начинаете погашать
          </span>
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Иконка</label>
          <div className={styles.iconGrid}>
            {PRESET_ICONS.map((icon) => (
              <button
                key={icon}
                type="button"
                className={`${styles.iconButton} ${
                  formData.icon === icon ? styles.iconButtonActive : ''
                }`}
                onClick={() => setFormData({ ...formData, icon })}
              >
                {icon}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Цвет</label>
          <div className={styles.colorGrid}>
            {PRESET_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                className={`${styles.colorButton} ${
                  formData.color === color ? styles.colorButtonActive : ''
                }`}
                style={{ background: color }}
                onClick={() => setFormData({ ...formData, color })}
              />
            ))}
          </div>
        </div>

        <div className={styles.actions}>
          <button
            type="button"
            onClick={onClose}
            className={styles.cancelButton}
            disabled={isLoading}
          >
            Отмена
          </button>
          <button
            type="submit"
            className={styles.submitButton}
            disabled={isLoading}
          >
            {isLoading ? 'Создание...' : 'Создать'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
