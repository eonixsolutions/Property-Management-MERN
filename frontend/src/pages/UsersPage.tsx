import { useState, useEffect, useCallback } from 'react';
import { Navigate } from 'react-router-dom';
import type { AxiosError } from 'axios';
import { useAuth } from '@context/AuthContext';
import { usersApi } from '@api/users.api';
import type { ApiUser, CreateUserInput, UpdateUserInput, PaginationMeta } from '@api/users.api';
import type { UserRole } from '@api/auth.types';

// ── Styles ────────────────────────────────────────────────────────────────────

const s = {
  page: { padding: '1.5rem' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' },
  title: { fontSize: '1.3rem', fontWeight: 700, color: '#1a1a2e' },
  addBtn: { padding: '0.5rem 1rem', backgroundColor: '#4f8ef7', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer' },
  errorBanner: { backgroundColor: '#fee2e2', border: '1px solid #fca5a5', color: '#991b1b', borderRadius: '4px', padding: '0.6rem 0.75rem', fontSize: '0.8rem', marginBottom: '1rem' },
  table: { width: '100%', borderCollapse: 'collapse' as const, backgroundColor: '#fff', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' },
  th: { textAlign: 'left' as const, padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb', textTransform: 'uppercase' as const, letterSpacing: '0.05em' },
  td: { padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#374151', borderBottom: '1px solid #f3f4f6' },
  actionBtn: { padding: '0.25rem 0.6rem', fontSize: '0.78rem', borderRadius: '3px', cursor: 'pointer', border: '1px solid', marginLeft: '0.4rem' },
  editBtn: { backgroundColor: '#eff6ff', borderColor: '#bfdbfe', color: '#1d4ed8' },
  deleteBtn: { backgroundColor: '#fef2f2', borderColor: '#fecaca', color: '#dc2626' },
  badge: { display: 'inline-block', padding: '0.15rem 0.5rem', borderRadius: '999px', fontSize: '0.72rem', fontWeight: 600 },
  pagination: { display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '1rem', justifyContent: 'flex-end' },
  pageBtn: { padding: '0.35rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '4px', backgroundColor: '#fff', cursor: 'pointer', fontSize: '0.8rem' },
  // Modal overlay
  overlay: { position: 'fixed' as const, inset: 0, backgroundColor: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 },
  modal: { backgroundColor: '#fff', borderRadius: '8px', padding: '2rem', width: '420px', maxWidth: '90vw', maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' },
  modalTitle: { fontSize: '1.1rem', fontWeight: 700, color: '#1a1a2e', marginBottom: '1.25rem' },
  field: { marginBottom: '0.875rem' },
  label: { display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: '0.3rem' },
  input: { width: '100%', padding: '0.5rem 0.65rem', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '0.875rem', color: '#111', boxSizing: 'border-box' as const },
  select: { width: '100%', padding: '0.5rem 0.65rem', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '0.875rem', color: '#111', backgroundColor: '#fff', boxSizing: 'border-box' as const },
  modalActions: { display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.25rem' },
  cancelBtn: { padding: '0.5rem 1rem', border: '1px solid #d1d5db', borderRadius: '4px', backgroundColor: '#fff', cursor: 'pointer', fontSize: '0.875rem' },
  submitBtn: { padding: '0.5rem 1rem', backgroundColor: '#4f8ef7', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer' },
  confirmText: { fontSize: '0.875rem', color: '#374151', marginBottom: '1rem' },
  confirmDeleteBtn: { padding: '0.5rem 1rem', backgroundColor: '#dc2626', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer' },
} as const;

// ── Helpers ───────────────────────────────────────────────────────────────────

function roleBadgeStyle(role: UserRole): React.CSSProperties {
  const map: Record<UserRole, React.CSSProperties> = {
    SUPER_ADMIN: { backgroundColor: '#fef3c7', color: '#92400e' },
    ADMIN: { backgroundColor: '#ede9fe', color: '#5b21b6' },
    STAFF: { backgroundColor: '#f0fdf4', color: '#166534' },
  };
  return { ...s.badge, ...map[role] };
}

function statusBadgeStyle(status: string): React.CSSProperties {
  return {
    ...s.badge,
    ...(status === 'ACTIVE'
      ? { backgroundColor: '#d1fae5', color: '#065f46' }
      : { backgroundColor: '#fee2e2', color: '#991b1b' }),
  };
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function resolveError(err: unknown): string {
  const e = err as AxiosError<{ error?: { code?: string; message?: string } }>;
  const code = e.response?.data?.error?.code;
  switch (code) {
    case 'DUPLICATE': return 'An account with this email already exists.';
    case 'FORBIDDEN': return e.response?.data?.error?.message ?? 'Permission denied.';
    case 'NOT_FOUND': return 'User not found.';
    case 'CONFLICT': return e.response?.data?.error?.message ?? 'Action not allowed.';
    case 'VALIDATION_ERROR': return e.response?.data?.error?.message ?? 'Validation failed. Check your inputs.';
    default: return 'An unexpected error occurred. Please try again.';
  }
}

// ── Modal form state ──────────────────────────────────────────────────────────

interface ModalState {
  mode: 'add' | 'edit';
  target?: ApiUser;
}

interface FormState {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  role: UserRole | '';
  status: 'ACTIVE' | 'SUSPENDED';
  phone: string;
}

function emptyForm(): FormState {
  return {
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: '',
    status: 'ACTIVE',
    phone: '',
  };
}

function formFromUser(u: ApiUser): FormState {
  return {
    firstName: u.firstName ?? '',
    lastName: u.lastName ?? '',
    email: u.email,
    password: '',
    confirmPassword: '',
    role: u.role,
    status: u.status,
    phone: u.phone ?? '',
  };
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function UsersPage() {
  const { user: currentUser } = useAuth();

  // ── All hooks must be declared unconditionally (Rules of Hooks) ───────────
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState('');

  const [modal, setModal] = useState<ModalState | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [confirmDelete, setConfirmDelete] = useState<ApiUser | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // ── Fetch users ───────────────────────────────────────────────────────────
  const fetchUsers = useCallback(async (p: number) => {
    setLoading(true);
    setListError('');
    try {
      const { users: list, meta: m } = await usersApi.list(p);
      setUsers(list);
      setMeta(m);
    } catch (err) {
      setListError(resolveError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchUsers(page);
  }, [page, fetchUsers]);

  // ── Role guard — after all hooks ──────────────────────────────────────────
  if (currentUser?.role === 'STAFF') return <Navigate to="/dashboard" replace />;

  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';

  // ── Modal helpers ─────────────────────────────────────────────────────────
  function openAdd() {
    setForm(emptyForm());
    setFormError('');
    setModal({ mode: 'add' });
  }

  function openEdit(u: ApiUser) {
    setForm(formFromUser(u));
    setFormError('');
    setModal({ mode: 'edit', target: u });
  }

  function closeModal() {
    setModal(null);
    setFormError('');
  }

  // ── Form submission ───────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');
      setSubmitting(true);
      // Validate passwords match for add, and for edit when a new password was entered
      if (modal?.mode === 'add') {
        if (form.password !== form.confirmPassword) {
          setFormError('Passwords do not match.');
          setSubmitting(false);
          return;
        }
      } else if (modal?.mode === 'edit' && form.password) {
        if (form.password !== form.confirmPassword) {
          setFormError('Passwords do not match.');
          setSubmitting(false);
          return;
        }
      }
    try {
      if (modal?.mode === 'add') {
        const payload: CreateUserInput = {
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email,
          password: form.password,
          phone: form.phone || undefined,
          role: (form.role || undefined) as UserRole | undefined,
        };
        await usersApi.create(payload);
      } else if (modal?.mode === 'edit' && modal.target) {
        const payload: UpdateUserInput = {
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email || undefined,
          phone: form.phone || undefined,
          status: form.status,
          role: (form.role || undefined) as UserRole | undefined,
        };
        // Only send password if the admin typed a new one
        if (form.password) payload.password = form.password;
        await usersApi.update(modal.target._id, payload);
      }
      closeModal();
      void fetchUsers(page);
    } catch (err) {
      setFormError(resolveError(err));
    } finally {
      setSubmitting(false);
    }
  }

  // ── Delete ────────────────────────────────────────────────────────────────
  async function handleDelete() {
    if (!confirmDelete) return;
    setDeleting(true);
    setDeleteError('');
    try {
      await usersApi.remove(confirmDelete._id);
      setConfirmDelete(null);
      // If we deleted the last item on this page, go back one page
      if (users.length === 1 && page > 1) setPage(page - 1);
      else void fetchUsers(page);
    } catch (err) {
      setDeleteError(resolveError(err));
    } finally {
      setDeleting(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={s.page}>
      {/* Header */}
      <div style={s.header}>
        <h1 style={s.title}>Users</h1>
        <button style={s.addBtn} onClick={openAdd}>+ Add User</button>
      </div>

      {listError && <div style={s.errorBanner}>{listError}</div>}

      {/* Table */}
      {loading ? (
        <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>Loading…</p>
      ) : (
        <>
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>Name</th>
                <th style={s.th}>Email</th>
                <th style={s.th}>Role</th>
                <th style={s.th}>Status</th>
                <th style={s.th}>Phone</th>
                <th style={s.th}>Created</th>
                <th style={s.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td style={{ ...s.td, color: '#9ca3af' }} colSpan={6}>No users found.</td>
                </tr>
              ) : (
                users.map((u) => {
                  //const isSelf = u._id === currentUser?.id;
                  //const canDelete = isSuperAdmin && !isSelf;
                  const canDelete =
                    isSuperAdmin &&
                    !!currentUser &&
                    u._id !== currentUser.id;

                  return (
                    <tr key={u._id}>
                      <td style={s.td}>
                        {u.fullName ?? `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim()}
                      </td>
                      <td style={s.td}>{u.email}</td>
                      <td style={s.td}>
                        <span style={roleBadgeStyle(u.role)}>{u.role.replace('_', ' ')}</span>
                      </td>
                      <td style={s.td}>
                        <span style={statusBadgeStyle(u.status)}>{u.status}</span>
                      </td>
                      <td style={{ ...s.td, color: u.phone ? '#374151' : '#9ca3af' }}>
                        {u.phone ?? '—'}
                      </td>
                      <td style={s.td}>{formatDate(u.createdAt)}</td>
                      <td style={s.td}>
                        <button
                          style={{ ...s.actionBtn, ...s.editBtn }}
                          onClick={() => openEdit(u)}
                        >
                          Edit
                        </button>
                        {canDelete && (
                          <button
                            style={{ ...s.actionBtn, ...s.deleteBtn }}
                            onClick={() => { setDeleteError(''); setConfirmDelete(u); }}
                          >
                            Delete
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>

          {/* Pagination */}
          {meta && meta.totalPages > 1 && (
            <div style={s.pagination}>
              <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                Page {meta.page} of {meta.totalPages} ({meta.total} users)
              </span>
              <button
                style={{ ...s.pageBtn, opacity: meta.hasPrevPage ? 1 : 0.4 }}
                disabled={!meta.hasPrevPage}
                onClick={() => setPage((p) => p - 1)}
              >
                Prev
              </button>
              <button
                style={{ ...s.pageBtn, opacity: meta.hasNextPage ? 1 : 0.4 }}
                disabled={!meta.hasNextPage}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      {/* Add / Edit Modal */}
      {modal && (
        <div style={s.overlay} onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}>
          <div style={s.modal}>
            <h2 style={s.modalTitle}>{modal.mode === 'add' ? 'Add User' : 'Edit User'}</h2>

            {formError && <div style={{ ...s.errorBanner, marginBottom: '1rem' }}>{formError}</div>}

            <form onSubmit={(e) => void handleSubmit(e)}>
              <div style={s.field}>
                <label style={s.label} htmlFor="u-firstName">First Name</label>
                <input
                  id="u-firstName"
                  style={s.input}
                  type="text"
                  value={form.firstName}
                  onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                  required
                  disabled={submitting}
                />
              </div>

              <div style={s.field}>
                <label style={s.label} htmlFor="u-lastName">Last Name</label>
                <input
                  id="u-lastName"
                  style={s.input}
                  type="text"
                  value={form.lastName}
                  onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                  required
                  disabled={submitting}
                />
              </div>

              <div style={s.field}>
                <label style={s.label} htmlFor="u-email">Email</label>
                <input
                  id="u-email"
                  style={s.input}
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                  disabled={submitting}
                />
              </div>

              <div style={s.field}>
                <label style={s.label} htmlFor="u-password">
                  Password {modal.mode === 'edit' && <span style={{ fontWeight: 400, color: '#9ca3af' }}>(leave blank to keep current)</span>}
                </label>
                <input
                  id="u-password"
                  style={s.input}
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required={modal.mode === 'add'}
                  autoComplete="new-password"
                  disabled={submitting}
                />
              </div>

              <div style={s.field}>
                <label style={s.label} htmlFor="u-password-confirm">Confirm Password</label>
                <input
                  id="u-password-confirm"
                  style={s.input}
                  type="password"
                  value={form.confirmPassword}
                  onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                  required={modal.mode === 'add' || !!form.password}
                  autoComplete="new-password"
                  disabled={submitting}
                />
              </div>

              <div style={s.field}>
                <label style={s.label} htmlFor="u-phone">Phone</label>
                <input
                  id="u-phone"
                  style={s.input}
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  disabled={submitting}
                />
              </div>

              {/* Role — only visible to SUPER_ADMIN */}
              {isSuperAdmin && (
                <div style={s.field}>
                  <label style={s.label} htmlFor="u-role">Role</label>
                  <select
                    id="u-role"
                    style={s.select}
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value as UserRole | '' })}
                    disabled={submitting}
                  >
                    <option value="">STAFF (default)</option>
                    <option value="STAFF">STAFF</option>
                    <option value="ADMIN">ADMIN</option>
                    <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                  </select>
                </div>
              )}

              {/* Status — only on edit */}
              {modal.mode === 'edit' && (
                <div style={s.field}>
                  <label style={s.label} htmlFor="u-status">Status</label>
                  <select
                    id="u-status"
                    style={s.select}
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value as 'ACTIVE' | 'SUSPENDED' })}
                    disabled={submitting}
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="SUSPENDED">SUSPENDED</option>
                  </select>
                </div>
              )}

              <div style={s.modalActions}>
                <button style={s.cancelBtn} type="button" onClick={closeModal} disabled={submitting}>
                  Cancel
                </button>
                <button style={{ ...s.submitBtn, opacity: submitting ? 0.7 : 1 }} type="submit" disabled={submitting}>
                  {submitting ? 'Saving…' : modal.mode === 'add' ? 'Create User' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDelete && (
        <div style={s.overlay} onClick={(e) => { if (e.target === e.currentTarget && !deleting) setConfirmDelete(null); }}>
          <div style={s.modal}>
            <h2 style={s.modalTitle}>Delete User</h2>
            <p style={s.confirmText}>
              Are you sure you want to permanently delete{' '}
              <strong>
                {confirmDelete.fullName ?? confirmDelete.email}
              </strong>? This action cannot be undone.
            </p>
            {deleteError && <div style={{ ...s.errorBanner, marginBottom: '1rem' }}>{deleteError}</div>}
            <div style={s.modalActions}>
              <button
                style={s.cancelBtn}
                type="button"
                onClick={() => setConfirmDelete(null)}
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                style={{ ...s.confirmDeleteBtn, opacity: deleting ? 0.7 : 1 }}
                type="button"
                onClick={() => void handleDelete()}
                disabled={deleting}
              >
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
