import { type ComponentType, lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { supabase } from '@/services/supabase';
import { setUser } from '@/store/slices/authSlice';
import { absoluteAppUrl, appPathname } from '@/utils/appUrl';
import type { RootState } from '@/store';
import { Layout } from '@/components/Layout/Layout';
import '@/styles/globals.scss';

// Каждая страница — отдельный чанк: при входе грузится только нужная
// (особенно важно для аналитики с тяжёлой библиотекой графиков)
function lazyPage<K extends string>(
  load: () => Promise<Record<K, ComponentType>>,
  name: K,
) {
  return lazy(() => load().then((module) => ({ default: module[name] })));
}

const AuthPage = lazyPage(() => import('@/pages/AuthPage/AuthPage'), 'AuthPage');
const ResetPasswordPage = lazyPage(
  () => import('@/pages/AuthPage/ResetPasswordPage'),
  'ResetPasswordPage',
);
const AccountsPage = lazyPage(
  () => import('@/pages/AccountsPage/AccountsPage'),
  'AccountsPage',
);
const TransactionsPage = lazyPage(
  () => import('@/pages/TransactionsPage/TransactionsPage'),
  'TransactionsPage',
);
const MonthsListPage = lazyPage(
  () => import('@/pages/MonthsListPage/MonthsListPage'),
  'MonthsListPage',
);
const MonthBudgetPage = lazyPage(
  () => import('@/pages/Monthbudgetpage/MonthBudgetPage'),
  'MonthBudgetPage',
);
const CategoriesPage = lazyPage(
  () => import('@/pages/Categoriespage/Categoriespage'),
  'CategoriesPage',
);
const AnalyticsPage = lazyPage(
  () => import('@/pages/AnalyticsPage/AnalyticsPage'),
  'AnalyticsPage',
);

function App() {
  const dispatch = useDispatch();
  const { isAuthenticated, isLoading } = useSelector((state: RootState) => state.auth);

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
      <Suspense fallback={null}>
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
                  {/* Внутри каркаса: пока грузится страница, шапка и навигация на месте */}
                  <Suspense fallback={null}>
                    <Routes>
                      <Route path="/" element={<AccountsPage />} />
                      <Route path="/transactions" element={<TransactionsPage />} />
                      <Route path="/months" element={<MonthsListPage />} />
                      <Route path="/months/:id" element={<MonthBudgetPage />} />
                      <Route path="/categories" element={<CategoriesPage />} />
                      <Route path="/credits" element={<Navigate to="/" replace />} />
                      <Route path="/analytics" element={<AnalyticsPage />} />
                      <Route
                        path="/settings"
                        element={<div>Настройки (в разработке)</div>}
                      />
                    </Routes>
                  </Suspense>
                </Layout>
              ) : (
                <Navigate to="/auth" replace />
              )
            }
          />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
