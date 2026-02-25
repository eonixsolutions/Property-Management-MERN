import { Link } from 'react-router-dom';

const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f6fa',
    textAlign: 'center' as const,
    padding: '2rem',
  },
  code: {
    fontSize: '6rem',
    fontWeight: 800,
    color: '#d1d5db',
    lineHeight: 1,
  },
  title: {
    fontSize: '1.5rem',
    fontWeight: 600,
    color: '#1a1a2e',
    margin: '0.5rem 0',
  },
  link: {
    marginTop: '1.5rem',
    display: 'inline-block',
    padding: '0.6rem 1.25rem',
    backgroundColor: '#4f8ef7',
    color: '#fff',
    borderRadius: '4px',
    fontWeight: 500,
    fontSize: '0.875rem',
  },
};

export default function NotFoundPage() {
  return (
    <div style={styles.page}>
      <div style={styles.code}>404</div>
      <h1 style={styles.title}>Page not found</h1>
      <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>
        The page you are looking for does not exist.
      </p>
      <Link to="/dashboard" style={styles.link}>
        Go to Dashboard
      </Link>
    </div>
  );
}
