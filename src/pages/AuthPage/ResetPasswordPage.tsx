import { FormEvent, useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/services/supabase';
import type { RootState } from '@/store';
import { errorMessage } from '@/utils/ledger';
import { assetUrl } from '@/utils/appUrl';
import form from '@/styles/form.module.scss';
import styles from './AuthPage.module.scss';

// Сюда ведёт ссылка из письма: Supabase уже создал сессию по токену из URL,
// остаётся задать новый пароль
export const ResetPasswordPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      setError('Пароли не совпадают');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      navigate('/', { replace: true });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <img src={assetUrl('logo.png')} alt="" className={styles.logo} />
          <h1 className={styles.title}>Новый пароль</h1>
          <p className={styles.subtitle}>
            {isAuthenticated
              ? 'Придумайте пароль для входа'
              : 'Ссылка устарела или уже использована'}
          </p>
        </div>

        {isAuthenticated ? (
          <form onSubmit={handleSubmit} className={form.form}>
            <label className={form.field}>
              <span className={form.label}>Новый пароль</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Минимум 6 символов"
                required
                minLength={6}
                autoComplete="new-password"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                autoFocus
              />
            </label>
            <label className={form.field}>
              <span className={form.label}>Повторите пароль</span>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
              />
            </label>

            {error && <div className={styles.error}>{error}</div>}

            <button type="submit" className={form.primaryBtn} disabled={loading}>
              {loading ? 'Сохранение...' : 'Сохранить пароль'}
            </button>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => navigate('/auth', { replace: true })}
            className={`${form.primaryBtn} ${styles.fullWidth}`}
          >
            Запросить новую ссылку
          </button>
        )}
      </div>
    </div>
  );
};
