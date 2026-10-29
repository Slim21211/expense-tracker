import { FormEvent, useState } from 'react';
import { supabase } from '@/services/supabase';
import { errorMessage } from '@/utils/ledger';
import { absoluteAppUrl, assetUrl } from '@/utils/appUrl';
import form from '@/styles/form.module.scss';
import styles from './AuthPage.module.scss';

type AuthMode = 'login' | 'signup' | 'reset';

const SUBTITLES: Record<AuthMode, string> = {
  login: 'Войдите в свой аккаунт',
  signup: 'Создайте новый аккаунт',
  reset: 'Пришлём ссылку для смены пароля',
};

const SUBMIT_LABELS: Record<AuthMode, string> = {
  login: 'Войти',
  signup: 'Зарегистрироваться',
  reset: 'Отправить ссылку',
};

export const AuthPage = () => {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const switchMode = (next: AuthMode) => {
    setMode(next);
    setError(null);
    setMessage(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: absoluteAppUrl() },
        });
        if (error) throw error;
        setMessage('Проверьте почту для подтверждения регистрации');
      } else if (mode === 'reset') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: absoluteAppUrl('reset-password'),
        });
        if (error) throw error;
        setMessage('Если такой аккаунт есть, на почту придёт ссылка для смены пароля');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
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
          <h1 className={styles.title}>Трекер расходов</h1>
          <p className={styles.subtitle}>{SUBTITLES[mode]}</p>
        </div>

        <form onSubmit={handleSubmit} className={form.form}>
          <label className={form.field}>
            <span className={form.label}>Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              autoComplete="email"
              inputMode="email"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint={mode === 'reset' ? 'send' : 'next'}
              autoFocus
            />
          </label>

          {mode !== 'reset' && (
            <label className={form.field}>
              <span className={styles.labelRow}>
                <span className={form.label}>Пароль</span>
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={() => switchMode('reset')}
                    className={styles.inlineLink}
                  >
                    Забыли пароль?
                  </button>
                )}
              </span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Минимум 6 символов"
                required
                minLength={6}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                enterKeyHint="go"
              />
            </label>
          )}

          {error && <div className={styles.error}>{error}</div>}
          {message && <div className={styles.message}>{message}</div>}

          <button type="submit" className={form.primaryBtn} disabled={loading}>
            {loading ? 'Подождите...' : SUBMIT_LABELS[mode]}
          </button>
        </form>

        <div className={styles.footer}>
          {mode === 'login' ? (
            <button type="button" onClick={() => switchMode('signup')} className={styles.link}>
              Нет аккаунта? Зарегистрируйтесь
            </button>
          ) : (
            <button type="button" onClick={() => switchMode('login')} className={styles.link}>
              {mode === 'signup' ? 'Уже есть аккаунт? Войдите' : 'Вспомнили пароль? Войдите'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
