import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '@context/AuthContext';
import { usersApi } from '@api/users.api';
import type { ApiUser, CreateUserInput, UpdateUserInput, PaginationMeta, UserStats } from '@api/users.api';
import type { UserRole } from '@api/auth.types';
import { addUserSchema, editUserSchema } from '@validations/user.form.schema';
import { sh } from '@/styles/shared';
import { resolveError, zodFieldErrors } from '@utils/formHelpers';
import type { FieldErrors } from '@utils/formHelpers';
import { Pagination } from '@components/common/Pagination';
import { ConfirmDialog } from '@components/common/ConfirmDialog';
import { formatDateLong, formatDateTime } from '@utils/formatDate';

// ── Styles ────────────────────────────────────────────────────────────────────

const s = {
  ...sh,
  // Stats cards
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.75rem', marginBottom: '1.25rem' },
  statCard: { backgroundColor: '#fff', borderRadius: '8px', padding: '1rem 1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.07)' },
  statLabel: { fontSize: '0.72rem', color: '#9ca3af', fontWeight: 500, textTransform: 'uppercase' as const, letterSpacing: '0.05em', marginBottom: '0.2rem' },
  statValue: { fontSize: '1.6rem', fontWeight: 700, color: '#1a1a2e' },
  // Filters
  filtersRow: { display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' as const, alignItems: 'center' },
  filterInput: { padding: '0.45rem 0.65rem', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '0.875rem', color: '#111', flex: '1 1 220px', minWidth: '180px' },
  clearBtn: { padding: '0.45rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '4px', backgroundColor: '#fff', cursor: 'pointer', fontSize: '0.8rem', color: '#6b7280' },
  // Table extras
  selfTag: { fontSize: '0.75rem', color: '#9ca3af', marginLeft: '0.4rem', fontStyle: 'italic' as const },
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
  const map: Record<string, React.CSSProperties> = {
    ACTIVE: { backgroundColor: '#d1fae5', color: '#065f46' },
    SUSPENDED: { backgroundColor: '#fee2e2', color: '#991b1b' },
  };
  return { ...s.badge, ...(map[status] ?? { backgroundColor: '#f3f4f6', color: '#6b7280' }) };
}

// ── Form state ────────────────────────────────────────────────────────────────

interface ModalState { mode: 'add' | 'edit'; target?: ApiUser }

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
  return { firstName: '', lastName: '', email: '', password: '', confirmPassword: '', role: '', status: 'ACTIVE', phone: '' };
}

function formFromUser(u: ApiUser): FormState {
  return { firstName: u.firstName ?? '', lastName: u.lastName ?? '', email: u.email, password: '', confirmPassword: '', role: u.role, status: u.status, phone: u.phone ?? '' };
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function UsersPage() {
  const { user: currentUser } = useAuth();

  // ── State (all hooks before any conditional return) ───────────────────────
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState('');

  // Filters
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | ''>('');
  const [statusFilter, setStatusFilter] = useState<'ACTIVE' | 'SUSPENDED' | ''>('');
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Modal
  const [modal, setModal] = useState<ModalState | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Delete
  const [confirmDelete, setConfirmDelete] = useState<ApiUser | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // Lock body scroll when any modal is open
  useEffect(() => {
    document.body.style.overflow = modal || confirmDelete ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [modal, confirmDelete]);

  // ── Fetch users ───────────────────────────────────────────────────────────
  const fetchUsers = useCallback(async (p: number, s: string, r: UserRole | '', st: 'ACTIVE' | 'SUSPENDED' | '') => {
    setLoading(true);
    setListError('');
    try {
      const { users: list, meta: m } = await usersApi.list({ page: p, search: s || undefined, role: r || undefined, status: st || undefined });
      setUsers(list);
      setMeta(m);
    } catch (err) {
      setListError(resolveError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const stats = await usersApi.stats();
      setUserStats(stats);
    } catch {
      // non-critical — stats are supplementary
    }
  }, []);

  useEffect(() => {
    void fetchUsers(page, search, roleFilter, statusFilter);
    // search is intentionally excluded — it's handled via the debounce handler
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, roleFilter, statusFilter, fetchUsers]);

  useEffect(() => {
    void fetchStats();
  }, [fetchStats]);

  // ── Role guard — after all hooks ──────────────────────────────────────────
  if (currentUser?.role === 'STAFF') return <Navigate to="/dashboard" replace />;

  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';
  const isAdminOrAbove = currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'ADMIN';

  // ── Search debounce ───────────────────────────────────────────────────────
  function handleSearchChange(val: string) {
    setSearch(val);
    setPage(1);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      void fetchUsers(1, val, roleFilter, statusFilter);
    }, 400);
  }

  function clearFilters() {
    setSearch('');
    setRoleFilter('');
    setStatusFilter('');
    setPage(1);
    void fetchUsers(1, '', '', '');
  }

  // ── Modal helpers ─────────────────────────────────────────────────────────
  function openAdd() {
    setForm(emptyForm());
    setFieldErrors({});
    setFormError('');
    setModal({ mode: 'add' });
  }

  function openEdit(u: ApiUser) {
    setForm(formFromUser(u));
    setFieldErrors({});
    setFormError('');
    setModal({ mode: 'edit', target: u });
  }

  function closeModal() {
    setModal(null);
    setFieldErrors({});
    setFormError('');
  }

  // ── Real-time per-field validation ────────────────────────────────────────
  function validateField(name: keyof FormState, value: string, currentForm: FormState) {
    const schema = modal?.mode === 'add' ? addUserSchema : editUserSchema;
    const testData = { ...currentForm, [name]: value };
    const result = schema.safeParse(testData);
    if (result.success) {
      setFieldErrors((prev) => { const next = { ...prev }; delete next[name]; return next; });
    } else {
      const errs = zodFieldErrors(result.error);
      if (errs[name]) {
        setFieldErrors((prev) => ({ ...prev, [name]: errs[name] }));
      } else {
        setFieldErrors((prev) => { const next = { ...prev }; delete next[name]; return next; });
      }
    }
  }

  function handleFieldChange<K extends keyof FormState>(name: K, value: FormState[K]) {
    const newForm = { ...form, [name]: value };
    setForm(newForm);
    validateField(name, String(value), newForm);
    // If updating password, also re-validate confirmPassword
    if (name === 'password') validateField('confirmPassword', newForm.confirmPassword, newForm);
  }

  // ── Form submission ───────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');

    const schema = modal?.mode === 'add' ? addUserSchema : editUserSchema;
    const result = schema.safeParse(form);

    if (!result.success) {
      setFieldErrors(zodFieldErrors(result.error));
      setFormError(result.error.issues[0]?.message ?? 'Please fix the errors above.');
      return;
    }

    setFieldErrors({});
    setSubmitting(true);
    try {
      if (modal?.mode === 'add') {
        const payload: CreateUserInput = {
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email,
          password: form.password,
          phone: form.phone || undefined,
          role: (form.role || undefined) as UserRole | undefined,
          status: form.status,
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
        if (form.password) payload.password = form.password;
        await usersApi.update(modal.target._id, payload);
      }
      closeModal();
      void fetchUsers(page, search, roleFilter, statusFilter);
      void fetchStats();
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
      if (users.length === 1 && page > 1) setPage(page - 1);
      else void fetchUsers(page, search, roleFilter, statusFilter);
      void fetchStats();
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
        <h1 style={s.title}>User Management</h1>
        {isAdminOrAbove && (
          <button style={s.addBtn} onClick={openAdd}>+ Add User</button>
        )}
      </div>

      {/* Stats Cards */}
      {userStats && (
        <div style={s.statsGrid}>
          <div style={s.statCard}>
            <div style={s.statLabel}>Total Users</div>
            <div style={{ ...s.statValue, color: '#4f8ef7' }}>{userStats.total}</div>
          </div>
          <div style={s.statCard}>
            <div style={s.statLabel}>Active Users</div>
            <div style={{ ...s.statValue, color: '#059669' }}>{userStats.active}</div>
          </div>
          <div style={s.statCard}>
            <div style={s.statLabel}>Inactive / Suspended</div>
            <div style={{ ...s.statValue, color: '#dc2626' }}>{userStats.suspended}</div>
          </div>
        </div>
      )}

      {listError && <div style={s.errorBanner}>{listError}</div>}

      {/* Filters */}
      <div style={s.filtersRow}>
        <input
          style={s.filterInput}
          type="text"
          placeholder="Search by name or email…"
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
        />
        <select
          style={s.filterSelect}
          value={roleFilter}
          onChange={(e) => { setRoleFilter(e.target.value as UserRole | ''); setPage(1); }}
        >
          <option value="">All Roles</option>
          <option value="SUPER_ADMIN">Super Admin</option>
          <option value="ADMIN">Admin</option>
          <option value="STAFF">Staff</option>
        </select>
        <select
          style={s.filterSelect}
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value as 'ACTIVE' | 'SUSPENDED' | ''); setPage(1); }}
        >
          <option value="">All Status</option>
          <option value="ACTIVE">Active</option>
          <option value="SUSPENDED">Suspended</option>
        </select>
        {(search || roleFilter || statusFilter) && (
          <button style={s.clearBtn} onClick={clearFilters}>Clear</button>
        )}
      </div>

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
                <th style={s.th}>Phone</th>
                <th style={s.th}>Role</th>
                <th style={s.th}>Status</th>
                <th style={s.th}>Last Login</th>
                <th style={s.th}>Created</th>
                <th style={s.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td style={{ ...s.td, color: '#9ca3af' }} colSpan={8}>No users found.</td>
                </tr>
              ) : (
                users.map((u) => {
                  const isSelf = u._id === currentUser?.id;
                  const canEdit = isAdminOrAbove && (!isSelf || isSuperAdmin);
                  const canDelete = isSuperAdmin && !isSelf;

                  return (
                    <tr key={u._id}>
                      <td style={s.td}>
                        <Link
                          to={`/users/${u._id}`}
                          style={{ color: '#1d4ed8', textDecoration: 'none', fontWeight: 600 }}
                        >
                          {u.fullName ?? (`${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() || '—')}
                        </Link>
                        {isSelf && <span style={s.selfTag}>(You)</span>}
                      </td>
                      <td style={s.td}>{u.email}</td>
                      <td style={{ ...s.td, color: u.phone ? '#374151' : '#9ca3af' }}>
                        {u.phone ?? '—'}
                      </td>
                      <td style={s.td}>
                        <span style={roleBadgeStyle(u.role)}>{u.role.replace('_', ' ')}</span>
                      </td>
                      <td style={s.td}>
                        <span style={statusBadgeStyle(u.status)}>{u.status}</span>
                      </td>
                      <td style={{ ...s.td, color: u.lastLogin ? '#374151' : '#9ca3af' }}>
                        {u.lastLogin ? formatDateTime(u.lastLogin) : 'Never'}
                      </td>
                      <td style={s.td}>{formatDateLong(u.createdAt)}</td>
                      <td style={{ ...s.td, whiteSpace: 'nowrap' as const }}>
                        <Link
                          to={`/users/${u._id}`}
                          title="View profile"
                          style={{ ...s.actionBtn, ...s.viewBtn, textDecoration: 'none' }}
                        >
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                        </Link>
                        {canEdit && (
                          <button
                            style={{ ...s.actionBtn, ...s.editBtn }}
                            type="button"
                            title="Edit user"
                            onClick={() => openEdit(u)}
                          >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                          </button>
                        )}
                        {canDelete && (
                          <button
                            style={{ ...s.actionBtn, ...s.deleteBtn }}
                            type="button"
                            title="Delete user"
                            onClick={() => { setDeleteError(''); setConfirmDelete(u); }}
                          >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                              <path d="M10 11v6M14 11v6" />
                              <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                            </svg>
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
          {meta && <Pagination meta={meta} onPageChange={setPage} />}
        </>
      )}

      {/* Add / Edit Modal */}
      {modal && (
        <div style={s.overlay} onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}>
          <div style={s.modal}>
            <h2 style={s.modalTitle}>{modal.mode === 'add' ? 'Add User' : 'Edit User'}</h2>

            {formError && <div style={s.modalError}>{formError}</div>}

            <form onSubmit={(e) => void handleSubmit(e)} noValidate>
              {/* First Name */}
              <div style={s.field}>
                <label style={s.label} htmlFor="u-firstName">First Name *</label>
                <input
                  id="u-firstName"
                  style={{ ...s.input, ...(fieldErrors.firstName ? s.inputError : {}) }}
                  type="text"
                  value={form.firstName}
                  onChange={(e) => handleFieldChange('firstName', e.target.value)}
                  disabled={submitting}
                  autoComplete="given-name"
                />
                {fieldErrors.firstName && <div style={s.fieldError}>{fieldErrors.firstName}</div>}
              </div>

              {/* Last Name */}
              <div style={s.field}>
                <label style={s.label} htmlFor="u-lastName">Last Name *</label>
                <input
                  id="u-lastName"
                  style={{ ...s.input, ...(fieldErrors.lastName ? s.inputError : {}) }}
                  type="text"
                  value={form.lastName}
                  onChange={(e) => handleFieldChange('lastName', e.target.value)}
                  disabled={submitting}
                  autoComplete="family-name"
                />
                {fieldErrors.lastName && <div style={s.fieldError}>{fieldErrors.lastName}</div>}
              </div>

              {/* Email */}
              <div style={s.field}>
                <label style={s.label} htmlFor="u-email">Email *</label>
                <input
                  id="u-email"
                  style={{ ...s.input, ...(fieldErrors.email ? s.inputError : {}) }}
                  type="email"
                  value={form.email}
                  onChange={(e) => handleFieldChange('email', e.target.value)}
                  disabled={submitting}
                  autoComplete="email"
                />
                {fieldErrors.email && <div style={s.fieldError}>{fieldErrors.email}</div>}
              </div>

              {/* Phone */}
              <div style={s.field}>
                <label style={s.label} htmlFor="u-phone">Phone</label>
                <input
                  id="u-phone"
                  style={{ ...s.input, ...(fieldErrors.phone ? s.inputError : {}) }}
                  type="tel"
                  value={form.phone}
                  onChange={(e) => handleFieldChange('phone', e.target.value)}
                  disabled={submitting}
                  autoComplete="tel"
                  placeholder="+974 XXXX XXXX"
                />
                {fieldErrors.phone && <div style={s.fieldError}>{fieldErrors.phone}</div>}
              </div>

              {/* Password */}
              <div style={s.field}>
                <label style={s.label} htmlFor="u-password">
                  Password{modal.mode === 'add' ? ' *' : ''}
                  {modal.mode === 'edit' && <span style={{ fontWeight: 400, color: '#9ca3af', marginLeft: '0.4rem' }}>(leave blank to keep current)</span>}
                </label>
                <input
                  id="u-password"
                  style={{ ...s.input, ...(fieldErrors.password ? s.inputError : {}) }}
                  type="password"
                  value={form.password}
                  onChange={(e) => handleFieldChange('password', e.target.value)}
                  disabled={submitting}
                  autoComplete="new-password"
                />
                {fieldErrors.password && <div style={s.fieldError}>{fieldErrors.password}</div>}
                {!fieldErrors.password && (
                  <div style={{ fontSize: '0.72rem', color: '#9ca3af', marginTop: '0.2rem' }}>
                    Min 8 chars · uppercase · lowercase · number · special character
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div style={s.field}>
                <label style={s.label} htmlFor="u-password-confirm">Confirm Password{(modal.mode === 'add' || form.password) ? ' *' : ''}</label>
                <input
                  id="u-password-confirm"
                  style={{ ...s.input, ...(fieldErrors.confirmPassword ? s.inputError : {}) }}
                  type="password"
                  value={form.confirmPassword}
                  onChange={(e) => handleFieldChange('confirmPassword', e.target.value)}
                  disabled={submitting}
                  autoComplete="new-password"
                />
                {fieldErrors.confirmPassword && <div style={s.fieldError}>{fieldErrors.confirmPassword}</div>}
              </div>

              {/* Role — only SUPER_ADMIN can assign roles */}
              {isSuperAdmin && (
                <div style={s.field}>
                  <label style={s.label} htmlFor="u-role">Role</label>
                  <select
                    id="u-role"
                    style={s.select}
                    value={form.role}
                    onChange={(e) => handleFieldChange('role', e.target.value as UserRole | '')}
                    disabled={submitting}
                  >
                    <option value="">Staff (default)</option>
                    <option value="STAFF">Staff</option>
                    <option value="ADMIN">Admin</option>
                    <option value="SUPER_ADMIN">Super Admin</option>
                  </select>
                </div>
              )}

              {/* Status */}
              <div style={s.field}>
                <label style={s.label} htmlFor="u-status">Status</label>
                <select
                  id="u-status"
                  style={s.select}
                  value={form.status}
                  onChange={(e) => handleFieldChange('status', e.target.value as 'ACTIVE' | 'SUSPENDED')}
                  disabled={submitting}
                >
                  <option value="ACTIVE">Active</option>
                  <option value="SUSPENDED">Suspended</option>
                </select>
              </div>

              <div style={s.modalActions}>
                <button style={s.cancelBtn} type="button" onClick={closeModal} disabled={submitting}>
                  Cancel
                </button>
                <button
                  style={{ ...s.submitBtn, ...(submitting ? s.submitBtnDisabled : {}) }}
                  type="submit"
                  disabled={submitting}
                >
                  {submitting ? 'Saving…' : modal.mode === 'add' ? 'Create User' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDelete && (
        <ConfirmDialog
          title="Delete User"
          message={
            <>
              Are you sure you want to permanently delete{' '}
              <strong>{confirmDelete.fullName ?? confirmDelete.email}</strong>? This action cannot be undone.
              {deleteError && <div style={{ ...s.errorBanner, marginTop: '0.75rem', marginBottom: 0 }}>{deleteError}</div>}
            </>
          }
          confirmLabel={deleting ? 'Deleting…' : 'Delete'}
          isLoading={deleting}
          isDanger
          onConfirm={() => void handleDelete()}
          onCancel={() => { if (!deleting) setConfirmDelete(null); }}
        />
      )}
    </div>
  );
}
