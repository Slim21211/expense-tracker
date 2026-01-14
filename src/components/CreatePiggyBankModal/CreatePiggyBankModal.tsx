import { useState } from 'react';
import { useCreatePiggyBankMutation } from '@/services/api';
import { Modal } from '@/components/Modal/Modal';
import styles from './CreatePiggyBankModal.module.scss';

interface CreatePiggyBankModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ICONS = ['💰', '🏠', '🚗', '✈️', '🎓', '💍', '🎮', '📱', '💻', '🏖️'];
const COLORS = ['#6366f1', '#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6'];

export const CreatePiggyBankModal = ({ isOpen, onClose }: CreatePiggyBankModalProps) => {
  const [createPiggyBank, { isLoading }] = useCreatePiggyBankMutation();
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [selectedIcon, setSelectedIcon] = useState(ICONS[0]);
  const [selectedColor, setSelectedColor] = useState(COLORS[0]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name || !targetAmount) return;

    try {
      await createPiggyBank({
        name,
        target_amount: parseFloat(targetAmount),
        current_amount: 0,
        icon: selectedIcon,
        color: selectedColor,
        is_archived: false,
      }).unwrap();
      
      onClose();
    } catch (error) {
      console.error('Failed to create piggy bank:', error);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Новая копилка">
      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.field}>
          <label htmlFor="name" className={styles.label}>
            Название
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={styles.input}
            placeholder="Например: Отпуск"
            required
          />
        </div>

        <div className={styles.field}>
          <label htmlFor="target" className={styles.label}>
            Целевая сумма (₽)
          </label>
          <input
            id="target"
            type="number" step="0.01"
            value={targetAmount}
            onChange={(e) => setTargetAmount(e.target.value)}
            className={styles.input}
            placeholder="100000"
            required
            min="1"
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Иконка</label>
          <div className={styles.iconGrid}>
            {ICONS.map((icon) => (
              <button
                key={icon}
                type="button"
                onClick={() => setSelectedIcon(icon)}
                className={`${styles.iconButton} ${selectedIcon === icon ? styles.iconButtonActive : ''}`}
              >
                {icon}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Цвет</label>
          <div className={styles.colorGrid}>
            {COLORS.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => setSelectedColor(color)}
                className={`${styles.colorButton} ${selectedColor === color ? styles.colorButtonActive : ''}`}
                style={{ backgroundColor: color }}
              >
                {selectedColor === color && '✓'}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.buttonGroup}>
          <button
            type="submit"
            className={styles.submitButton}
            disabled={isLoading || !name || !targetAmount}
          >
            {isLoading ? 'Создание...' : 'Создать'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className={styles.cancelButton}
          >
            Отмена
          </button>
        </div>
      </form>
    </Modal>
  );
};
