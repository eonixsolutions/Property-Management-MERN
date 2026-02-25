import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import type { AxiosError } from 'axios';
import { useAuth } from '@context/AuthContext';
import { authApi } from '@api/auth.api';

const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f6fa',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: '8px',
    padding: '2.5rem',
    width: '360px',
    boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
  },
  title: {
    fontSize: '1.4rem',
    fontWeight: 700,
    marginBottom: '0.25rem',
    color: '#1a1a2e',
  },
  subtitle: {
    fontSize: '0.875rem',
    color: '#9ca3af',
    marginBottom: '2rem',
  },
  field: {
    marginBottom: '1rem',
  },
  label: {
    display: 'block',
    fontSize: '0.8rem',
    fontWeight: 600,
    color: '#374151',
    marginBottom: '0.3rem',
  },
  input: {
    width: '100%',
    padding: '0.55rem 0.75rem',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    fontSize: '0.875rem',
    color: '#111',
    outline: 'none',
    boxSizing: 'border-box' as const,
  },
  button: {
    width: '100%',
    padding: '0.7rem',
    backgroundColor: '#4f8ef7',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    fontSize: '0.9rem',
    fontWeight: 600,
    cursor: 'pointer',
    marginTop: '0.5rem',
  },
  buttonDisabled: {
    opacity: 0.7,
    cursor: 'not-allowed' as const,
  },
  error: {
    backgroundColor: '#fee2e2',
    border: '1px solid #fca5a5',
    color: '#991b1b',
    borderRadius: '4px',
    padding: '0.6rem 0.75rem',
    fontSize: '0.8rem',
    marginBottom: '1rem',
  },
};

/** Maps backend error codes to user-friendly messages. */
function resolveErrorMessage(err: unknown): string {
  const axiosErr = err as AxiosError<{ error?: { code?: string; message?: string } }>;
  const code = axiosErr.response?.data?.error?.code;

  switch (code) {
    case 'INVALID_CREDENTIALS':
      return 'Incorrect email or password.';
    case 'ACCOUNT_SUSPENDED':
      return 'Your account has been suspended. Please contact an administrator.';
    case 'RATE_LIMIT_EXCEEDED':
      return 'Too many login attempts. Please wait a few minutes and try again.';
    case 'VALIDATION_ERROR': {
      const msg = axiosErr.response?.data?.error?.message;
      return msg ?? 'Please check your email and password.';
    }
    default:
      if (axiosErr.code === 'ECONNABORTED' || axiosErr.code === 'ERR_NETWORK') {
        return 'Cannot reach the server. Check your connection and try again.';
      }
      return 'An unexpected error occurred. Please try again.';
  }
}

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? '/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { accessToken, user } = await authApi.login(email, password);
      login(accessToken, { id: user.id, role: user.role, email: user.email });
      navigate(from, { replace: true });
    } catch (err) {
      setError(resolveErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>Sign in</h1>
        <p style={styles.subtitle}>Property Management System</p>

        {error && <div style={styles.error}>{error}</div>}

        <form onSubmit={(e) => void handleSubmit(e)}>
          <div style={styles.field}>
            <label style={styles.label} htmlFor="email">
              Email
            </label>
            <input
              id="email"
              style={styles.input}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
              disabled={loading}
            />
          </div>
          <div style={styles.field}>
            <label style={styles.label} htmlFor="password">
              Password
            </label>
            <input
              id="password"
              style={styles.input}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              disabled={loading}
            />
          </div>
          <button
            style={{ ...styles.button, ...(loading ? styles.buttonDisabled : {}) }}
            type="submit"
            disabled={loading}
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
