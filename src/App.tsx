import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { supabase } from '@/services/supabase';
import { setUser } from '@/store/slices/authSlice';
import { absoluteAppUrl, appPathname } from '@/utils/appUrl';
import type { RootState } from '@/store';
import { AuthPage } from '@/pages/AuthPage/AuthPage';
import { ResetPasswordPage } from '@/pages/AuthPage/ResetPasswordPage';
import { AccountsPage } from '@/pages/AccountsPage/AccountsPage';
import { Layout } from '@/components/Layout/Layout';
import '@/styles/globals.scss';
import { MonthBudgetPage } from '@/pages/Monthbudgetpage/MonthBudgetPage';
import { TransactionsPage } from '@/pages/TransactionsPage/TransactionsPage';
import { MonthsListPage } from './pages/MonthsListPage/MonthsListPage';
import { CategoriesPage } from './pages/Categoriespage/Categoriespage';

function App() {
  const dispatch = useDispatch();
  const { isAuthenticated, isLoading } = useSelector(
    (state: RootState) => state.auth
  );

  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      dispatch(setUser(session?.user ?? null));
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      dispatch(setUser(session?.user ?? null));
      // Ссылка из письма могла привести не на /reset-password (если адрес
      // не разрешён в настройках Supabase) — всё равно ведём на смену пароля
      if (event === 'PASSWORD_RECOVERY' && appPathname() !== '/reset-password') {
        window.location.replace(absoluteAppUrl('reset-password'));
      }
    });

    return () => subscription.unsubscribe();
  }, [dispatch]);

  if (isLoading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          fontSize: '1.25rem',
          color: 'var(--color-text-secondary)',
        }}
      >
        Загрузка...
      </div>
    );
  }

  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Routes>
        <Route
          path="/auth"
          element={isAuthenticated ? <Navigate to="/" replace /> : <AuthPage />}
        />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route
          path="/*"
          element={
            isAuthenticated ? (
              <Layout>
                <Routes>
                  <Route path="/" element={<AccountsPage />} />
                  <Route path="/transactions" element={<TransactionsPage />} />
                  <Route path="/months" element={<MonthsListPage />} />
                  <Route path="/months/:id" element={<MonthBudgetPage />} />
                  <Route path="/categories" element={<CategoriesPage />} />
                  <Route path="/credits" element={<Navigate to="/" replace />} />
                  <Route
                    path="/analytics"
                    element={<div>Аналитика (в разработке)</div>}
                  />
                  <Route
                    path="/settings"
                    element={<div>Настройки (в разработке)</div>}
                  />
                </Routes>
              </Layout>
            ) : (
              <Navigate to="/auth" replace />
            )
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
