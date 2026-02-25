interface PlaceholderPageProps {
  title: string;
  description: string;
  phase: number;
}

const styles = {
  page: {
    padding: '2rem',
  },
  header: {
    marginBottom: '1.5rem',
  },
  title: {
    fontSize: '1.5rem',
    fontWeight: 700,
    color: '#1a1a2e',
    marginBottom: '0.25rem',
  },
  description: {
    fontSize: '0.9rem',
    color: '#6b7280',
  },
  card: {
    backgroundColor: '#fff',
    border: '2px dashed #d1d5db',
    borderRadius: '8px',
    padding: '3rem 2rem',
    textAlign: 'center' as const,
  },
  badge: {
    display: 'inline-block',
    backgroundColor: '#eff6ff',
    color: '#1e40af',
    border: '1px solid #bfdbfe',
    borderRadius: '9999px',
    padding: '0.2rem 0.75rem',
    fontSize: '0.75rem',
    fontWeight: 600,
    marginBottom: '1rem',
  },
  placeholder: {
    fontSize: '0.9rem',
    color: '#9ca3af',
    lineHeight: 1.7,
  },
};

export function PlaceholderPage({ title, description, phase }: PlaceholderPageProps) {
  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <h1 style={styles.title}>{title}</h1>
        <p style={styles.description}>{description}</p>
      </div>
      <div style={styles.card}>
        <div style={styles.badge}>Phase {phase}</div>
        <p style={styles.placeholder}>
          This module will be implemented in <strong>Phase {phase}</strong> of the migration.
          <br />
          The route, navigation, and layout are already wired up and ready.
        </p>
      </div>
    </div>
  );
}
