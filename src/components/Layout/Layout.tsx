import { ReactNode, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { signOut } from '@/services/supabase';
import { useDeleteTransactionMutation } from '@/services/api';
import { QuickExpense } from '@/components/QuickExpense/QuickExpense';
import { TransactionModal } from '@/components/TransactionModal/TransactionModal';
import { Icon, type IconName } from '@/components/Icon/Icon';
import type { Transaction } from '@/types/database';
import { assetUrl } from '@/utils/appUrl';
import styles from './Layout.module.scss';

interface LayoutProps {
  children: ReactNode;
}

const NAV: { to: string; icon: IconName; label: string }[] = [
  { to: '/', icon: 'wallet', label: 'Счета' },
  { to: '/months', icon: 'calendar', label: 'Бюджет' },
  { to: '/transactions', icon: 'list', label: 'Операции' },
  { to: '/categories', icon: 'tag', label: 'Категории' },
];

type Sheet = null | 'quick' | 'full';

export const Layout = ({ children }: LayoutProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [sheet, setSheet] = useState<Sheet>(null);
  const [toast, setToast] = useState<null | { label: string; transaction: Transaction }>(
    null
  );
  const [deleteTransaction] = useDeleteTransactionMutation();

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(timer);
  }, [toast]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const isActive = (path: string) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  const navLink = (item: (typeof NAV)[number]) => (
    <Link
      key={item.to}
      to={item.to}
      className={`${styles.navLink} ${isActive(item.to) ? styles.navLinkActive : ''}`}
    >
      <Icon name={item.icon} size={22} className={styles.navIcon} />
      <span>{item.label}</span>
    </Link>
  );

  return (
    <div className={styles.layout}>
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <Link to="/" className={styles.logo}>
            <img src={assetUrl('logo.png')} alt="" className={styles.logoMark} />
            <span className={styles.logoText}>Трекер расходов</span>
          </Link>
          <nav className={styles.topNav}>{NAV.map(navLink)}</nav>
          <div className={styles.headerActions}>
            <button onClick={() => setSheet('quick')} className={styles.addButton}>
              <Icon name="plus" size={18} />
              Расход
            </button>
            <button
              onClick={handleSignOut}
              className={styles.logoutButton}
              aria-label="Выйти"
              title="Выйти"
            >
              <Icon name="logout" size={20} />
            </button>
          </div>
        </div>
      </header>

      <main className={styles.main}>{children}</main>

      <nav className={styles.bottomNav}>
        {NAV.slice(0, 2).map(navLink)}
        <button
          onClick={() => setSheet('quick')}
          className={styles.fab}
          aria-label="Добавить расход"
        >
          <Icon name="plus" size={28} />
        </button>
        {NAV.slice(2).map(navLink)}
      </nav>

      {toast && (
        <div className={styles.toast} role="status">
          <Icon name="check" size={18} className={styles.toastIcon} />
          <span className={styles.toastText}>{toast.label}</span>
          <button
            className={styles.toastAction}
            onClick={() => {
              deleteTransaction(toast.transaction.id);
              setToast(null);
            }}
          >
            Отменить
          </button>
        </div>
      )}

      {sheet === 'quick' && (
        <QuickExpense
          onClose={() => setSheet(null)}
          onMore={() => setSheet('full')}
          onSaved={(transaction, label) => {
            setSheet(null);
            setToast({ transaction, label });
          }}
        />
      )}
      {sheet === 'full' && (
        <TransactionModal
          defaults={{ kind: 'income' }}
          onClose={() => setSheet(null)}
        />
      )}
    </div>
  );
};
