/**
 * Shared CSS-in-JS style objects used across all list/form pages.
 *
 * Usage:
 *   import { sh } from '@/styles/shared';
 *   const s = { ...sh, /* page-specific overrides *\/ };
 *
 * This eliminates the ~30 identical style declarations repeated in every page.
 */
export const sh = {
  // ── Layout ────────────────────────────────────────────────────────────────
  page: { padding: '1.5rem' },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '1.25rem',
    flexWrap: 'wrap' as const,
    gap: '0.75rem',
  },
  title: { fontSize: '1.3rem', fontWeight: 700, color: '#1a1a2e', margin: 0 },

  // ── Primary action button ─────────────────────────────────────────────────
  addBtn: {
    padding: '0.5rem 1rem',
    backgroundColor: '#4f8ef7',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    fontSize: '0.875rem',
    fontWeight: 600,
    cursor: 'pointer',
  },

  // ── Table ─────────────────────────────────────────────────────────────────
  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
    backgroundColor: '#fff',
    borderRadius: '8px',
    overflow: 'hidden',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
  },
  th: {
    textAlign: 'left' as const,
    padding: '0.75rem 1rem',
    fontSize: '0.75rem',
    fontWeight: 600,
    color: '#6b7280',
    backgroundColor: '#f9fafb',
    borderBottom: '1px solid #e5e7eb',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
  },
  td: {
    padding: '0.75rem 1rem',
    fontSize: '0.875rem',
    color: '#374151',
    borderBottom: '1px solid #f3f4f6',
    verticalAlign: 'middle' as const,
  },
  emptyRow: { textAlign: 'center' as const, color: '#9ca3af', fontSize: '0.875rem' },

  // ── Badge ─────────────────────────────────────────────────────────────────
  badge: {
    display: 'inline-block',
    padding: '0.15rem 0.5rem',
    borderRadius: '999px',
    fontSize: '0.72rem',
    fontWeight: 600,
  },

  // ── Filter bar ────────────────────────────────────────────────────────────
  filterBar: {
    display: 'flex',
    gap: '0.75rem',
    marginBottom: '1rem',
    flexWrap: 'wrap' as const,
    alignItems: 'center' as const,
  },
  filterSelect: {
    padding: '0.45rem 0.65rem',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    fontSize: '0.875rem',
    color: '#111',
    backgroundColor: '#fff',
  },
  searchInput: {
    padding: '0.45rem 0.65rem',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    fontSize: '0.875rem',
    minWidth: '200px',
    color: '#111',
  },

  // ── Banners ───────────────────────────────────────────────────────────────
  errorBanner: {
    backgroundColor: '#fee2e2',
    border: '1px solid #fca5a5',
    color: '#991b1b',
    borderRadius: '4px',
    padding: '0.6rem 0.75rem',
    fontSize: '0.8rem',
    marginBottom: '1rem',
  },
  warningBanner: {
    backgroundColor: '#fef3c7',
    border: '1px solid #fcd34d',
    color: '#92400e',
    borderRadius: '4px',
    padding: '0.5rem 0.65rem',
    fontSize: '0.8rem',
    marginTop: '0.4rem',
  },

  // ── Table row action buttons ───────────────────────────────────────────────
  actionBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '0.25rem',
    borderRadius: '3px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    lineHeight: 1 as unknown as string,
    flexShrink: 0,
    marginLeft: '0.25rem',
  },
  viewBtn: { color: '#166534' },
  editBtn: { color: '#1d4ed8' },
  deleteBtn: { color: '#be123c' },

  // ── Pagination ────────────────────────────────────────────────────────────
  pagination: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    marginTop: '1rem',
    justifyContent: 'flex-end',
  },
  pageBtn: {
    padding: '0.35rem 0.75rem',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    backgroundColor: '#fff',
    cursor: 'pointer',
    fontSize: '0.8rem',
  },
  pageBtnDisabled: { opacity: 0.5, cursor: 'not-allowed' as const },
  pageInfo: { fontSize: '0.8rem', color: '#6b7280' },

  // ── Modal ─────────────────────────────────────────────────────────────────
  overlay: {
    position: 'fixed' as const,
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
    display: 'flex',
    alignItems: 'flex-start' as const,
    justifyContent: 'center',
    zIndex: 50,
    overflowY: 'auto' as const,
    padding: '2rem 1rem',
  },
  modal: {
    backgroundColor: '#fff',
    borderRadius: '8px',
    padding: '2rem',
    width: '520px',
    maxWidth: '100%',
    boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
    margin: 'auto',
  },
  modalTitle: {
    fontSize: '1.1rem',
    fontWeight: 700,
    color: '#1a1a2e',
    marginBottom: '1.25rem',
    marginTop: 0,
  },
  modalError: {
    backgroundColor: '#fee2e2',
    border: '1px solid #fca5a5',
    color: '#991b1b',
    borderRadius: '4px',
    padding: '0.5rem 0.65rem',
    fontSize: '0.8rem',
    marginBottom: '0.875rem',
  },
  modalActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '0.75rem',
    marginTop: '1.5rem',
    paddingTop: '1rem',
    borderTop: '1px solid #f3f4f6',
  },

  // ── Form fields ───────────────────────────────────────────────────────────
  field: { marginBottom: '0.875rem' },
  fieldRow: { display: 'flex', gap: '0.75rem' },
  label: {
    display: 'block',
    fontSize: '0.8rem',
    fontWeight: 600,
    color: '#374151',
    marginBottom: '0.3rem',
  },
  input: {
    width: '100%',
    padding: '0.5rem 0.65rem',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    fontSize: '0.875rem',
    color: '#111',
    boxSizing: 'border-box' as const,
  },
  select: {
    width: '100%',
    padding: '0.5rem 0.65rem',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    fontSize: '0.875rem',
    color: '#111',
    backgroundColor: '#fff',
    boxSizing: 'border-box' as const,
  },
  textarea: {
    width: '100%',
    padding: '0.5rem 0.65rem',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    fontSize: '0.875rem',
    color: '#111',
    boxSizing: 'border-box' as const,
    minHeight: '60px',
    resize: 'vertical' as const,
  },
  inputError: { borderColor: '#f87171' },
  fieldError: { fontSize: '0.75rem', color: '#dc2626', marginTop: '0.2rem' },
  hint: { fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem', lineHeight: 1.4 },

  // ── Form action buttons ───────────────────────────────────────────────────
  cancelBtn: {
    padding: '0.5rem 1rem',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    backgroundColor: '#fff',
    cursor: 'pointer',
    fontSize: '0.875rem',
    color: '#374151',
  },
  submitBtn: {
    padding: '0.5rem 1rem',
    backgroundColor: '#4f8ef7',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    fontSize: '0.875rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
  submitBtnDisabled: { opacity: 0.7, cursor: 'not-allowed' as const },
  dangerBtn: {
    padding: '0.5rem 1rem',
    backgroundColor: '#dc2626',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    fontSize: '0.875rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
} as const;
