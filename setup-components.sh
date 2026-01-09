#!/bin/bash

# This script creates all remaining components for the Expense Tracker app

cd "$(dirname "$0")"

# Layout Component
mkdir -p src/components/Layout
cat > src/components/Layout/Layout.tsx << 'EOF'
import { ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { signOut } from '@/services/supabase';
import styles from './Layout.module.css';

interface LayoutProps {
  children: ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  const location = useLocation();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className={styles.layout}>
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <Link to="/" className={styles.logo}>
            <span className={styles.logoIcon}>💰</span>
            <span className={styles.logoText}>Трекер расходов</span>
          </Link>
          <button onClick={handleSignOut} className={styles.logoutButton}>
            Выйти
          </button>
        </div>
      </header>

      <nav className={styles.nav}>
        <div className={styles.navContent}>
          <Link 
            to="/" 
            className={`${styles.navLink} ${isActive('/') ? styles.navLinkActive : ''}`}
          >
            <span className={styles.navIcon}>🏠</span>
            <span>Копилки</span>
          </Link>
          <Link 
            to="/months" 
            className={`${styles.navLink} ${isActive('/months') ? styles.navLinkActive : ''}`}
          >
            <span className={styles.navIcon}>📅</span>
            <span>Месяцы</span>
          </Link>
          <Link 
            to="/analytics" 
            className={`${styles.navLink} ${isActive('/analytics') ? styles.navLinkActive : ''}`}
          >
            <span className={styles.navIcon}>📊</span>
            <span>Аналитика</span>
          </Link>
          <Link 
            to="/settings" 
            className={`${styles.navLink} ${isActive('/settings') ? styles.navLinkActive : ''}`}
          >
            <span className={styles.navIcon}>⚙️</span>
            <span>Настройки</span>
          </Link>
        </div>
      </nav>

      <main className={styles.main}>
        {children}
      </main>
    </div>
  );
};
EOF

cat > src/components/Layout/Layout.module.css << 'EOF'
.layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--color-surface);
}

.header {
  background: var(--color-surface-elevated);
  border-bottom: 1px solid var(--color-border);
  position: sticky;
  top: 0;
  z-index: var(--z-sticky);
}

.headerContent {
  max-width: 1280px;
  margin: 0 auto;
  padding: var(--spacing-md) var(--spacing-lg);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.logo {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
  text-decoration: none;
}

.logoIcon {
  font-size: 1.5rem;
}

.logoText {
  display: none;
}

.logoutButton {
  padding: 0.5rem var(--spacing-md);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-secondary);
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);
}

.logoutButton:hover {
  background: var(--color-surface);
  color: var(--color-text-primary);
}

.nav {
  background: var(--color-surface-elevated);
  border-bottom: 1px solid var(--color-border);
  position: sticky;
  top: 61px;
  z-index: var(--z-sticky);
}

.navContent {
  max-width: 1280px;
  margin: 0 auto;
  display: flex;
  gap: var(--spacing-sm);
  padding: 0 var(--spacing-lg);
  overflow-x: auto;
}

.navLink {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-md) var(--spacing-lg);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-secondary);
  text-decoration: none;
  border-bottom: 2px solid transparent;
  white-space: nowrap;
  transition: all var(--transition-fast);
}

.navLink:hover {
  color: var(--color-text-primary);
}

.navIcon {
  font-size: 1.125rem;
}

.navLinkActive {
  color: var(--color-primary);
  border-bottom-color: var(--color-primary);
}

.main {
  flex: 1;
  max-width: 1280px;
  width: 100%;
  margin: 0 auto;
  padding: var(--spacing-xl) var(--spacing-lg);
}

@media (min-width: 640px) {
  .logoText {
    display: inline;
  }
  
  .navLink {
    font-size: var(--font-size-base);
  }
}

@media (min-width: 768px) {
  .main {
    padding: var(--spacing-2xl) var(--spacing-xl);
  }
}
EOF

# PiggyBankCard Component
mkdir -p src/components/PiggyBankCard
cat > src/components/PiggyBankCard/PiggyBankCard.tsx << 'EOF'
import { useState } from 'react';
import { useUpdatePiggyBankMutation } from '@/services/api';
import type { PiggyBank } from '@/types/database';
import styles from './PiggyBankCard.module.css';

interface PiggyBankCardProps {
  piggyBank: PiggyBank;
}

export const PiggyBankCard = ({ piggyBank }: PiggyBankCardProps) => {
  const [updatePiggyBank] = useUpdatePiggyBankMutation();
  const [isEditing, setIsEditing] = useState(false);
  const [amount, setAmount] = useState('');

  const progress = piggyBank.target_amount > 0 
    ? (piggyBank.current_amount / piggyBank.target_amount) * 100 
    : 0;

  const handleAddMoney = async () => {
    if (!amount || parseFloat(amount) <= 0) return;
    
    const newAmount = piggyBank.current_amount + parseFloat(amount);
    await updatePiggyBank({
      id: piggyBank.id,
      current_amount: newAmount,
    });
    
    setAmount('');
    setIsEditing(false);
  };

  return (
    <div className={styles.card} style={{ borderLeftColor: piggyBank.color }}>
      <div className={styles.header}>
        <div className={styles.icon}>{piggyBank.icon}</div>
        <h3 className={styles.name}>{piggyBank.name}</h3>
      </div>

      <div className={styles.amounts}>
        <div className={styles.currentAmount}>
          {piggyBank.current_amount.toLocaleString('ru-RU')} ₽
        </div>
        <div className={styles.targetAmount}>
          из {piggyBank.target_amount.toLocaleString('ru-RU')} ₽
        </div>
      </div>

      <div className={styles.progressBar}>
        <div 
          className={styles.progressFill} 
          style={{ 
            width: `${Math.min(progress, 100)}%`,
            backgroundColor: piggyBank.color 
          }}
        />
      </div>
      
      <div className={styles.progressText}>
        {progress.toFixed(1)}% достигнуто
      </div>

      {isEditing ? (
        <div className={styles.editForm}>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Сумма"
            className={styles.input}
            autoFocus
          />
          <div className={styles.buttonGroup}>
            <button onClick={handleAddMoney} className={styles.saveButton}>
              Добавить
            </button>
            <button onClick={() => setIsEditing(false)} className={styles.cancelButton}>
              Отмена
            </button>
          </div>
        </div>
      ) : (
        <button onClick={() => setIsEditing(true)} className={styles.addButton}>
          + Пополнить
        </button>
      )}
    </div>
  );
};
EOF

cat > src/components/PiggyBankCard/PiggyBankCard.module.css << 'EOF'
.card {
  background: var(--color-surface-elevated);
  border-radius: var(--radius-lg);
  border-left: 4px solid var(--color-primary);
  padding: var(--spacing-lg);
  box-shadow: var(--shadow-sm);
  transition: all var(--transition-fast);
}

.card:hover {
  box-shadow: var(--shadow-md);
  transform: translateY(-2px);
}

.header {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-md);
}

.icon {
  font-size: 2rem;
}

.name {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
}

.amounts {
  margin-bottom: var(--spacing-md);
}

.currentAmount {
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-primary);
  margin-bottom: var(--spacing-xs);
}

.targetAmount {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.progressBar {
  height: 8px;
  background: var(--color-surface);
  border-radius: var(--radius-full);
  overflow: hidden;
  margin-bottom: var(--spacing-xs);
}

.progressFill {
  height: 100%;
  background: var(--color-primary);
  transition: width var(--transition-slow);
  border-radius: var(--radius-full);
}

.progressText {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  margin-bottom: var(--spacing-md);
}

.addButton {
  width: 100%;
  padding: 0.625rem var(--spacing-md);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-primary);
  background: transparent;
  border: 1px solid var(--color-primary);
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);
}

.addButton:hover {
  background: var(--color-primary);
  color: white;
}

.editForm {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.input {
  width: 100%;
  padding: 0.625rem var(--spacing-md);
  font-size: var(--font-size-sm);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);
}

.input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
}

.buttonGroup {
  display: flex;
  gap: var(--spacing-sm);
}

.saveButton,
.cancelButton {
  flex: 1;
  padding: 0.625rem var(--spacing-md);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);
}

.saveButton {
  color: white;
  background: var(--color-primary);
  border: none;
}

.saveButton:hover {
  background: var(--color-primary-dark);
}

.cancelButton {
  color: var(--color-text-secondary);
  background: transparent;
  border: 1px solid var(--color-border);
}

.cancelButton:hover {
  background: var(--color-surface);
  color: var(--color-text-primary);
}
EOF

# CreatePiggyBankModal Component
mkdir -p src/components/CreatePiggyBankModal
cat > src/components/CreatePiggyBankModal/CreatePiggyBankModal.tsx << 'EOF'
import { useState } from 'react';
import { useCreatePiggyBankMutation } from '@/services/api';
import { Modal } from '@/components/Modal/Modal';
import styles from './CreatePiggyBankModal.module.css';

interface CreatePiggyBankModalProps {
  onClose: () => void;
}

const ICONS = ['💰', '🏠', '🚗', '✈️', '🎓', '💍', '🎮', '📱', '💻', '🏖️'];
const COLORS = ['#6366f1', '#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6'];

export const CreatePiggyBankModal = ({ onClose }: CreatePiggyBankModalProps) => {
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
    <Modal onClose={onClose} title="Новая копилка">
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
            type="number"
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
EOF

cat > src/components/CreatePiggyBankModal/CreatePiggyBankModal.module.css << 'EOF'
.form {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
}

.field {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.label {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-primary);
}

.input {
  width: 100%;
  padding: 0.75rem var(--spacing-md);
  font-size: var(--font-size-base);
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);
}

.input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
}

.iconGrid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: var(--spacing-sm);
}

.iconButton {
  aspect-ratio: 1;
  font-size: 1.5rem;
  background: var(--color-surface);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);
}

.iconButton:hover {
  background: var(--color-surface-elevated);
  transform: scale(1.05);
}

.iconButtonActive {
  border-color: var(--color-primary);
  background: rgba(99, 102, 241, 0.1);
}

.colorGrid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--spacing-sm);
}

.colorButton {
  aspect-ratio: 1;
  font-size: 1.125rem;
  color: white;
  border: 3px solid transparent;
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);
}

.colorButton:hover {
  transform: scale(1.05);
}

.colorButtonActive {
  border-color: var(--color-text-primary);
  box-shadow: var(--shadow-md);
}

.buttonGroup {
  display: flex;
  gap: var(--spacing-sm);
  margin-top: var(--spacing-md);
}

.submitButton,
.cancelButton {
  flex: 1;
  padding: 0.875rem var(--spacing-lg);
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-semibold);
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);
}

.submitButton {
  color: white;
  background: var(--color-primary);
  border: none;
}

.submitButton:hover:not(:disabled) {
  background: var(--color-primary-dark);
}

.submitButton:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.cancelButton {
  color: var(--color-text-secondary);
  background: transparent;
  border: 1px solid var(--color-border);
}

.cancelButton:hover {
  background: var(--color-surface);
  color: var(--color-text-primary);
}

@media (max-width: 640px) {
  .iconGrid {
    grid-template-columns: repeat(4, 1fr);
  }
}
EOF

# Modal Component
mkdir -p src/components/Modal
cat > src/components/Modal/Modal.tsx << 'EOF'
import { ReactNode, useEffect } from 'react';
import styles from './Modal.module.css';

interface ModalProps {
  children: ReactNode;
  onClose: () => void;
  title?: string;
}

export const Modal = ({ children, onClose, title }: ModalProps) => {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    
    document.addEventListener('keydown', handleEscape);
    document.body.style.overflow = 'hidden';
    
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          {title && <h2 className={styles.title}>{title}</h2>}
          <button onClick={onClose} className={styles.closeButton}>
            ✕
          </button>
        </div>
        <div className={styles.content}>
          {children}
        </div>
      </div>
    </div>
  );
};
EOF

cat > src/components/Modal/Modal.module.css << 'EOF'
.backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-md);
  z-index: var(--z-modal-backdrop);
  animation: fadeIn var(--transition-fast);
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.modal {
  background: var(--color-surface-elevated);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-xl);
  max-width: 500px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  z-index: var(--z-modal);
  animation: slideUp var(--transition-base);
}

@keyframes slideUp {
  from {
    transform: translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-lg);
  border-bottom: 1px solid var(--color-border);
}

.title {
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
}

.closeButton {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
  color: var(--color-text-secondary);
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);
}

.closeButton:hover {
  background: var(--color-surface);
  color: var(--color-text-primary);
}

.content {
  padding: var(--spacing-lg);
}

@media (max-width: 640px) {
  .modal {
    max-height: 95vh;
  }
  
  .header,
  .content {
    padding: var(--spacing-md);
  }
}
EOF

# DashboardPage styles
cat > src/pages/DashboardPage/DashboardPage.module.css << 'EOF'
.container {
  min-height: calc(100vh - 200px);
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--spacing-xl);
  flex-wrap: wrap;
  gap: var(--spacing-md);
}

.title {
  font-size: var(--font-size-3xl);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-primary);
  margin-bottom: var(--spacing-xs);
}

.subtitle {
  font-size: var(--font-size-base);
  color: var(--color-text-secondary);
}

.addButton {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: 0.75rem var(--spacing-lg);
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-semibold);
  color: white;
  background: var(--color-primary);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
  transition: all var(--transition-fast);
}

.addButton:hover {
  background: var(--color-primary-dark);
  box-shadow: var(--shadow-md);
  transform: translateY(-1px);
}

.addButton span:first-child {
  font-size: 1.25rem;
}

.summary {
  background: linear-gradient(135deg, var(--color-primary), var(--color-primary-dark));
  border-radius: var(--radius-lg);
  padding: var(--spacing-xl);
  margin-bottom: var(--spacing-xl);
  box-shadow: var(--shadow-md);
}

.summaryContent {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.summaryText {
  color: white;
}

.summaryLabel {
  font-size: var(--font-size-sm);
  opacity: 0.9;
  margin-bottom: var(--spacing-xs);
}

.summaryValue {
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-bold);
}

.progressBar {
  height: 12px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: var(--radius-full);
  overflow: hidden;
}

.progressFill {
  height: 100%;
  background: white;
  border-radius: var(--radius-full);
  transition: width var(--transition-slow);
}

.progressPercent {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
  color: white;
  text-align: right;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: var(--spacing-lg);
}

.empty {
  text-align: center;
  padding: var(--spacing-2xl);
}

.emptyIcon {
  font-size: 5rem;
  margin-bottom: var(--spacing-lg);
}

.emptyTitle {
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
  margin-bottom: var(--spacing-sm);
}

.emptyText {
  font-size: var(--font-size-base);
  color: var(--color-text-secondary);
  margin-bottom: var(--spacing-xl);
}

.emptyButton {
  padding: 0.875rem var(--spacing-xl);
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-semibold);
  color: white;
  background: var(--color-primary);
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);
}

.emptyButton:hover {
  background: var(--color-primary-dark);
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.loading {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  font-size: var(--font-size-lg);
  color: var(--color-text-secondary);
}

@media (max-width: 768px) {
  .title {
    font-size: var(--font-size-2xl);
  }
  
  .grid {
    grid-template-columns: 1fr;
  }
  
  .summary {
    padding: var(--spacing-lg);
  }
  
  .summaryValue {
    font-size: var(--font-size-xl);
  }
}
EOF

echo "✅ All components created successfully!"
echo ""
echo "Next steps:"
echo "1. Run: npm install"
echo "2. Set up Supabase database with supabase/schema.sql"
echo "3. Run: npm run dev"
