import { ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { signOut } from '@/services/supabase';
import styles from './Layout.module.scss';

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
            className={`${styles.navLink} ${
              isActive('/') ? styles.navLinkActive : ''
            }`}
          >
            <span className={styles.navIcon}>🏠</span>
            <span>Копилки</span>
          </Link>

          <Link
            to="/months"
            className={`${styles.navLink} ${
              isActive('/months') ? styles.navLinkActive : ''
            }`}
          >
            <span className={styles.navIcon}>📅</span>
            <span>Месяцы</span>
          </Link>
          <Link
            to="/credits"
            className={`${styles.navLink} ${
              isActive('/credits') ? styles.navLinkActive : ''
            }`}
          >
            <span className={styles.navIcon}>💳</span>
            <span>Кредиты</span>
          </Link>
          <Link
            to="/categories"
            className={`${styles.navLink} ${
              isActive('/categories') ? styles.navLinkActive : ''
            }`}
          >
            <span className={styles.navIcon}>🏷️</span>
            <span>Категории</span>
          </Link>
          <Link
            to="/analytics"
            className={`${styles.navLink} ${
              isActive('/analytics') ? styles.navLinkActive : ''
            }`}
          >
            <span className={styles.navIcon}>📊</span>
            <span>Аналитика</span>
          </Link>
          <Link
            to="/settings"
            className={`${styles.navLink} ${
              isActive('/settings') ? styles.navLinkActive : ''
            }`}
          >
            <span className={styles.navIcon}>⚙️</span>
            <span>Настройки</span>
          </Link>
        </div>
      </nav>

      <main className={styles.main}>{children}</main>
    </div>
  );
};
