import { useState, useEffect, useCallback } from 'react';
import type { AxiosError } from 'axios';
import { contractsApi } from '@api/contracts.api';
import type {
  ApiContract,
  ContractFormData,
  ContractDefaults,
  UtilitiesResponsible,
} from '@api/contracts.api';
import type { PaginationMeta } from '@api/users.api';
import { tenantsApi } from '@api/tenants.api';
import type { TenantDropdownItem } from '@api/tenants.api';

// ── Default terms text ─────────────────────────────────────────────────────────

const DEFAULT_TERMS: Partial<ContractFormData> = {
  termsRent:
    'Tenant shall pay the monthly rent on or before the first (1st) day of each calendar month in Qatar Riyal (QAR). A late fee applies to payments received after the due date. Payment shall be made by bank transfer, cheque, or other agreed method as specified in this Agreement.',
  termsSecurity:
    'The security deposit shall be held as security for the faithful performance of all obligations under this Agreement. The deposit shall be returned within the return period after termination of tenancy, less deductions for unpaid rent, damages beyond normal wear and tear, or other amounts lawfully owed.',
  termsUse:
    'Tenant shall use the Property solely as a private residential dwelling. No commercial activity shall be conducted without prior written consent of Landlord. Tenant shall comply with all applicable laws, regulations, and community rules affecting the Property.',
  termsMaintenance:
    'Tenant shall maintain the Property in a clean and sanitary condition. Tenant is responsible for minor repairs not exceeding QAR 500. Landlord shall handle structural repairs and major maintenance. Tenant shall promptly notify Landlord in writing of any damage or defect requiring attention.',
  termsUtilities:
    'Utilities including electricity, water, cooling, and related services shall be the responsibility of the party designated in this Agreement. The responsible party shall arrange for, maintain, and timely pay all utility charges throughout the tenancy period.',
  termsQuiet:
    'Landlord covenants that, so long as Tenant pays rent when due and complies with all terms of this Agreement, Tenant shall peacefully and quietly hold and enjoy the Property for the term hereof, free from any interference by Landlord or any person claiming through Landlord.',
  termsAccess:
    'Landlord or authorized agents may enter the Property at reasonable times with at least 24 hours prior written notice for the purposes of inspection, making repairs, or showing the Property to prospective tenants or buyers. In cases of emergency, immediate entry is permitted without prior notice.',
  termsPets:
    'Pets are subject to the provisions set forth in this Agreement. If pets are permitted, Tenant shall pay the specified pet deposit and shall be fully responsible for any damage caused by pets. Tenant shall comply with all applicable laws and community rules regarding pets on the premises.',
  termsInsurance:
    'Tenant is strongly advised to obtain and maintain renters insurance covering personal property and liability throughout the tenancy. Landlord\'s insurance does not cover Tenant\'s personal belongings or Tenant\'s liability. Tenant shall indemnify and hold Landlord harmless from any claims arising from Tenant\'s use of the Property.',
  termsDefault:
    'If Tenant fails to pay rent when due or breaches any material term of this Agreement, Landlord may serve written notice of default. If Tenant fails to cure such default within the period specified herein after receipt of notice, Landlord may terminate this Agreement and pursue all available legal remedies including eviction and recovery of damages.',
  termsTermination:
    'Either party may terminate this Agreement at the end of the lease term by providing written notice to the other party at least the notice period specified herein before the termination date. If Tenant vacates before the end of the lease term without proper notice, Tenant may be liable for rent for the remaining term.',
  termsHoldover:
    'If Tenant remains in possession of the Property after expiration of the lease term without Landlord\'s express written consent, such holdover shall be on a month-to-month basis at the holdover rate specified herein. Either party may terminate the holdover tenancy by providing proper written notice.',
  termsGoverning:
    'This Agreement shall be governed by and construed in accordance with the laws of Qatar. Any disputes arising from or relating to this Agreement shall be subject to the exclusive jurisdiction of the competent courts of Qatar. The parties agree to attempt to resolve disputes amicably before resorting to litigation.',
  termsEntire:
    'This Agreement constitutes the entire agreement between the parties with respect to the subject matter hereof and supersedes all prior and contemporaneous agreements, negotiations, and understandings between the parties, whether written or oral. This Agreement may not be modified or amended except by a written instrument signed by both parties.',
  termsSeverability:
    'If any provision of this Agreement is found to be invalid, illegal, or unenforceable by a court of competent jurisdiction, the remaining provisions shall continue in full force and effect. The invalid or unenforceable provision shall be modified to the minimum extent necessary to make it valid, legal, and enforceable.',
};

// ── Helpers ────────────────────────────────────────────────────────────────────

const blankForm = (): ContractFormData => ({
  petsAllowed: false,
  utilitiesResponsible: 'Tenant' as UtilitiesResponsible,
  governingLaw: 'Qatar',
});

function mergeDefaults(prev: ContractFormData, d: ContractDefaults): ContractFormData {
  return {
    ...prev,
    landlordName: d.landlordName ?? prev.landlordName,
    landlordEmail: d.landlordEmail ?? prev.landlordEmail,
    landlordPhone: d.landlordPhone ?? prev.landlordPhone,
    governingLaw: d.governingLaw ?? prev.governingLaw,
    utilitiesResponsible: d.utilitiesResponsible ?? prev.utilitiesResponsible,
    petsAllowed: d.petsAllowed ?? prev.petsAllowed,
    tenantId: d.tenantId ?? prev.tenantId,
    tenantName: d.tenantName ?? prev.tenantName,
    tenantPhone: d.tenantPhone ?? prev.tenantPhone,
    tenantEmail: d.tenantEmail ?? prev.tenantEmail,
    tenantAlternatePhone: d.tenantAlternatePhone ?? prev.tenantAlternatePhone,
    tenantQatarId: d.tenantQatarId ?? prev.tenantQatarId,
    leaseStart: d.leaseStart ?? prev.leaseStart,
    leaseEnd: d.leaseEnd ?? prev.leaseEnd,
    monthlyRent: d.monthlyRent ?? prev.monthlyRent,
    securityDeposit: d.securityDeposit ?? prev.securityDeposit,
    emergencyContactName: d.emergencyContactName ?? prev.emergencyContactName,
    emergencyContactPhone: d.emergencyContactPhone ?? prev.emergencyContactPhone,
    propertyName: d.propertyName ?? prev.propertyName,
    propertyAddress: d.propertyAddress ?? prev.propertyAddress,
    propertyCity: d.propertyCity ?? prev.propertyCity,
    propertyState: d.propertyState ?? prev.propertyState,
    propertyZip: d.propertyZip ?? prev.propertyZip,
    propertyType: d.propertyType ?? prev.propertyType,
    propertyBedrooms: d.propertyBedrooms ?? prev.propertyBedrooms,
    propertyBathrooms: d.propertyBathrooms ?? prev.propertyBathrooms,
    propertySquareFeet: d.propertySquareFeet ?? prev.propertySquareFeet,
  };
}

function buildPrintHtml(c: ApiContract): string {
  const fmt = (label: string, val: string | number | boolean | null | undefined): string => {
    if (val === null || val === undefined || val === '') return '';
    return `<div class="f"><b>${label}:</b> ${String(val)}</div>`;
  };
  const fmtDate = (d?: string): string => (d ? new Date(d).toLocaleDateString('en-GB') : '');
  const fmtMoney = (n?: number): string =>
    n !== undefined && n !== null ? `QAR ${n.toLocaleString()}` : '';

  const termsHtml = [
    ['1. RENT', c.termsRent],
    ['2. SECURITY DEPOSIT', c.termsSecurity],
    ['3. USE OF PROPERTY', c.termsUse],
    ['4. MAINTENANCE', c.termsMaintenance],
    ['5. UTILITIES', c.termsUtilities],
    ['6. QUIET ENJOYMENT', c.termsQuiet],
    ['7. RIGHT OF ENTRY', c.termsAccess],
    ['8. PETS', c.termsPets],
    ['9. INSURANCE', c.termsInsurance],
    ['10. DEFAULT', c.termsDefault],
    ['11. TERMINATION', c.termsTermination],
    ['12. HOLDOVER', c.termsHoldover],
    ['13. GOVERNING LAW', c.termsGoverning],
    ['14. ENTIRE AGREEMENT', c.termsEntire],
    ['15. SEVERABILITY', c.termsSeverability],
  ]
    .map(([title, text]) => (text ? `<div class="ts"><h3>${title}</h3><p>${text}</p></div>` : ''))
    .join('');

  return `<!DOCTYPE html><html><head><title>Lease Agreement</title><style>
body{font-family:Arial,sans-serif;font-size:11pt;padding:15mm;color:#000}
h1{text-align:center;font-size:16pt;margin:0 0 3mm}
.sub{text-align:center;margin:0 0 6mm;font-size:11pt}
h2{font-size:12pt;background:#eee;padding:2mm 4mm;margin:5mm 0 2mm}
h3{font-size:10pt;margin:2mm 0 1mm;font-weight:bold}
.g2{display:grid;grid-template-columns:1fr 1fr;gap:2mm 8mm}
.f{margin:1mm 0;font-size:10pt}
.ts{margin:2mm 0 4mm}.ts p{font-size:10pt;text-align:justify;margin:1mm 0 0}
.sig{display:grid;grid-template-columns:1fr 1fr;gap:20mm;margin-top:20mm}
.sl{border-top:1px solid #000;margin-top:18mm;padding-top:2mm;font-size:9pt}
@page{margin:15mm}
</style></head><body>
<h1>RESIDENTIAL LEASE AGREEMENT</h1>
<p class="sub">${c.agreementDate ? 'Agreement Date: ' + fmtDate(c.agreementDate) : ''}</p>
<h2>PARTIES</h2>
<div class="g2">
  <div><h3>LANDLORD</h3>${fmt('Name', c.landlordName)}${fmt('Address', c.landlordAddress)}${fmt('Phone', c.landlordPhone)}${fmt('Email', c.landlordEmail)}</div>
  <div><h3>TENANT</h3>${fmt('Name', c.tenantName)}${fmt('Phone', c.tenantPhone)}${fmt('Email', c.tenantEmail)}${fmt('Alt. Phone', c.tenantAlternatePhone)}${fmt('Qatar ID', c.tenantQatarId)}</div>
</div>
<h2>PROPERTY</h2>
<div class="g2">
${fmt('Name', c.propertyName)}${fmt('Address', c.propertyAddress)}${fmt('City', c.propertyCity)}${fmt('State/Area', c.propertyState)}${fmt('Zip Code', c.propertyZip)}${fmt('Type', c.propertyType)}${fmt('Bedrooms', c.propertyBedrooms)}${fmt('Bathrooms', c.propertyBathrooms)}${fmt('Square Feet', c.propertySquareFeet)}
</div>
<h2>LEASE TERMS</h2>
<div class="g2">
${fmt('Lease Start', fmtDate(c.leaseStart))}${fmt('Lease End', fmtDate(c.leaseEnd))}${fmt('Monthly Rent', fmtMoney(c.monthlyRent))}${fmt('Security Deposit', fmtMoney(c.securityDeposit))}${fmt('Late Fee', c.lateFee)}${fmt('Return Period', c.returnPeriod)}${fmt('Notice Period', c.noticePeriod)}${fmt('Holdover Rate', c.holdoverRate)}${fmt('Pets Allowed', c.petsAllowed ? 'Yes' : 'No')}${c.petsAllowed ? fmt('Pet Deposit', fmtMoney(c.petDeposit)) : ''}${fmt('Utilities Responsible', c.utilitiesResponsible)}${fmt('Governing Law', c.governingLaw)}
</div>
<h2>TERMS AND CONDITIONS</h2>
${termsHtml}
<h2>EMERGENCY CONTACT</h2>
<div class="g2">
${fmt('Name', c.emergencyContactName)}${fmt('Phone', c.emergencyContactPhone)}
</div>
<div class="sig">
  <div><div class="sl">LANDLORD SIGNATURE &amp; DATE</div></div>
  <div><div class="sl">TENANT SIGNATURE &amp; DATE</div></div>
</div>
</body></html>`;
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const s = {
  page: { padding: '1.5rem' },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '1.25rem',
  },
  title: { fontSize: '1.3rem', fontWeight: 700, color: '#1a1a2e' },
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
  errorBanner: {
    backgroundColor: '#fee2e2',
    border: '1px solid #fca5a5',
    color: '#991b1b',
    borderRadius: '4px',
    padding: '0.6rem 0.75rem',
    fontSize: '0.8rem',
    marginBottom: '1rem',
  },
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
  },
  td: {
    padding: '0.75rem 1rem',
    fontSize: '0.875rem',
    color: '#111',
    borderBottom: '1px solid #f3f4f6',
  },
  actionBtn: {
    padding: '0.3rem 0.6rem',
    fontSize: '0.75rem',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    marginRight: '0.35rem',
  },
  overlay: {
    position: 'fixed' as const,
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '2rem 1rem',
    overflowY: 'auto' as const,
  },
  overlayBox: {
    width: '100%',
    maxWidth: '860px',
    display: 'flex',
    flexDirection: 'column' as const,
    backgroundColor: '#fff',
    borderRadius: '8px',
    overflow: 'hidden',
    flexShrink: 0,
  },
  overlayHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '1rem 1.5rem',
    borderBottom: '1px solid #e5e7eb',
    backgroundColor: '#fff',
    position: 'sticky' as const,
    top: 0,
    zIndex: 10,
  },
  overlayTitle: { fontSize: '1.1rem', fontWeight: 700, color: '#1a1a2e' },
  overlayBody: { flex: 1, padding: '1.5rem' },
  section: { marginBottom: '1.5rem' },
  sectionTitle: {
    fontSize: '0.75rem',
    fontWeight: 700,
    color: '#374151',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    marginBottom: '0.75rem',
    paddingBottom: '0.4rem',
    borderBottom: '2px solid #e5e7eb',
  },
  grid2: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '0.75rem',
  },
  label: {
    display: 'block',
    fontSize: '0.75rem',
    fontWeight: 600,
    color: '#4b5563',
    marginBottom: '0.25rem',
  },
  input: {
    width: '100%',
    padding: '0.45rem 0.65rem',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    fontSize: '0.875rem',
    color: '#111',
    boxSizing: 'border-box' as const,
  },
  textarea: {
    width: '100%',
    padding: '0.5rem 0.65rem',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    fontSize: '0.8rem',
    color: '#111',
    resize: 'vertical' as const,
    minHeight: '80px',
    boxSizing: 'border-box' as const,
    fontFamily: 'inherit',
    marginBottom: '0.75rem',
  },
  select: {
    width: '100%',
    padding: '0.45rem 0.65rem',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    fontSize: '0.875rem',
    color: '#111',
    backgroundColor: '#fff',
    boxSizing: 'border-box' as const,
  },
  checkRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.4rem 0',
  },
  overlayFooter: {
    display: 'flex',
    gap: '0.75rem',
    padding: '1rem 1.5rem',
    borderTop: '1px solid #e5e7eb',
    justifyContent: 'flex-end',
    backgroundColor: '#f9fafb',
  },
  dialog: {
    position: 'fixed' as const,
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1100,
  },
  dialogBox: {
    backgroundColor: '#fff',
    borderRadius: '8px',
    padding: '1.5rem',
    maxWidth: '380px',
    width: '90%',
    boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
  },
  pagination: {
    display: 'flex',
    gap: '0.5rem',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: '1rem',
  },
  pageBtn: {
    padding: '0.4rem 0.8rem',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    fontSize: '0.8rem',
    cursor: 'pointer',
    backgroundColor: '#fff',
  },
};

// ── Component ──────────────────────────────────────────────────────────────────

export default function ContractsPage() {
  const [contracts, setContracts] = useState<ApiContract[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 1,
    hasNextPage: false,
    hasPrevPage: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);

  const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ContractFormData>(blankForm());
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [tenants, setTenants] = useState<TenantDropdownItem[]>([]);

  // Load tenants dropdown once
  useEffect(() => {
    tenantsApi.dropdown().then(setTenants).catch(() => {});
  }, []);

  // Load contracts list
  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { contracts: data, meta: m } = await contractsApi.list({ page });
      setContracts(data);
      setMeta(m);
    } catch {
      setError('Failed to load contracts');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    void load();
  }, [load]);

  // Open create modal — pre-fill landlord defaults
  const openCreate = async () => {
    let f = blankForm();
    try {
      const defaults = await contractsApi.getDefaults();
      f = mergeDefaults(f, defaults);
    } catch {
      // continue without defaults
    }
    setForm(f);
    setFormError('');
    setEditingId(null);
    setModalMode('create');
  };

  // Open edit modal
  const openEdit = (c: ApiContract) => {
    const { _id: _d, userId: _u, createdAt: _ca, updatedAt: _ua, ...rest } = c;
    setForm(rest);
    setFormError('');
    setEditingId(c._id);
    setModalMode('edit');
  };

  // Generic field change handler
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      setForm((prev) => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
    } else if (type === 'number') {
      setForm((prev) => ({ ...prev, [name]: value === '' ? undefined : Number(value) }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value || undefined }));
    }
  };

  // Select a tenant to auto-fill form fields
  const handleTenantSelect = async (tenantId: string) => {
    if (!tenantId) {
      setForm((prev) => ({ ...prev, tenantId: undefined }));
      return;
    }
    setForm((prev) => ({ ...prev, tenantId }));
    try {
      const defaults = await contractsApi.getDefaults(tenantId);
      setForm((prev) => mergeDefaults(prev, defaults));
    } catch {
      // ignore
    }
  };

  // Fill all 15 terms with default boilerplate text
  const fillDefaultTerms = () => {
    setForm((prev) => ({ ...prev, ...DEFAULT_TERMS }));
  };

  // Save (create or update)
  const handleSave = async () => {
    setSaving(true);
    setFormError('');
    try {
      if (modalMode === 'create') {
        await contractsApi.create(form);
      } else if (editingId) {
        await contractsApi.update(editingId, form);
      }
      setModalMode(null);
      void load();
    } catch (err) {
      const e = err as AxiosError<{ message?: string }>;
      setFormError(e.response?.data?.message ?? 'Failed to save contract');
    } finally {
      setSaving(false);
    }
  };

  // Delete a contract
  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await contractsApi.remove(deleteId);
      setDeleteId(null);
      void load();
    } catch {
      setError('Failed to delete contract');
    }
  };

  // Print: open a new browser window with the full contract HTML
  const handlePrint = (c: ApiContract) => {
    const win = window.open('', '_blank', 'width=900,height=700');
    if (!win) return;
    win.document.write(buildPrintHtml(c));
    win.document.close();
    win.focus();
    win.print();
  };

  // ── Form field helpers ────────────────────────────────────────────────────────

  const fldStr = (label: string, name: keyof ContractFormData) => (
    <label key={name}>
      <span style={s.label}>{label}</span>
      <input
        style={s.input}
        name={name}
        value={(form[name] as string | undefined) ?? ''}
        onChange={handleChange}
      />
    </label>
  );

  const fldNum = (label: string, name: keyof ContractFormData) => (
    <label key={name}>
      <span style={s.label}>{label}</span>
      <input
        style={s.input}
        type="number"
        name={name}
        min={0}
        value={(form[name] as number | undefined) ?? ''}
        onChange={handleChange}
      />
    </label>
  );

  const fldDate = (label: string, name: keyof ContractFormData) => (
    <label key={name}>
      <span style={s.label}>{label}</span>
      <input
        style={s.input}
        type="date"
        name={name}
        value={(form[name] as string | undefined) ?? ''}
        onChange={handleChange}
      />
    </label>
  );

  const fldTextarea = (label: string, name: keyof ContractFormData) => (
    <div key={name}>
      <label style={s.label}>{label}</label>
      <textarea
        style={s.textarea}
        name={name}
        value={(form[name] as string | undefined) ?? ''}
        onChange={handleChange}
        rows={4}
      />
    </div>
  );

  // ── Render ────────────────────────────────────────────────────────────────────

  const fmtDate = (d?: string) => (d ? new Date(d).toLocaleDateString('en-GB') : '–');
  const fmtMoney = (n?: number) => (n !== undefined ? `QAR ${n.toLocaleString()}` : '–');

  return (
    <div style={s.page}>
      {/* Header */}
      <div style={s.header}>
        <h1 style={s.title}>Contracts</h1>
        <button style={s.addBtn} onClick={() => void openCreate()}>
          + New Contract
        </button>
      </div>

      {error && <div style={s.errorBanner}>{error}</div>}

      {/* Contracts table */}
      {loading ? (
        <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>Loading…</p>
      ) : contracts.length === 0 ? (
        <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
          No contracts yet. Click &quot;+ New Contract&quot; to create one.
        </p>
      ) : (
        <table style={s.table}>
          <thead>
            <tr>
              <th style={s.th}>#</th>
              <th style={s.th}>Tenant</th>
              <th style={s.th}>Property</th>
              <th style={s.th}>Lease Period</th>
              <th style={s.th}>Monthly Rent</th>
              <th style={s.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {contracts.map((c, idx) => (
              <tr key={c._id}>
                <td style={s.td}>{(page - 1) * meta.limit + idx + 1}</td>
                <td style={s.td}>{c.tenantName ?? '–'}</td>
                <td style={s.td}>{c.propertyName ?? '–'}</td>
                <td style={s.td}>
                  {c.leaseStart ?? c.leaseEnd
                    ? `${fmtDate(c.leaseStart)} – ${fmtDate(c.leaseEnd)}`
                    : '–'}
                </td>
                <td style={s.td}>{fmtMoney(c.monthlyRent)}</td>
                <td style={s.td}>
                  <button
                    style={{ ...s.actionBtn, backgroundColor: '#3b82f6', color: '#fff' }}
                    onClick={() => openEdit(c)}
                  >
                    Edit
                  </button>
                  <button
                    style={{ ...s.actionBtn, backgroundColor: '#10b981', color: '#fff' }}
                    onClick={() => handlePrint(c)}
                  >
                    Print
                  </button>
                  <button
                    style={{ ...s.actionBtn, backgroundColor: '#ef4444', color: '#fff' }}
                    onClick={() => setDeleteId(c._id)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Pagination */}
      {meta.totalPages > 1 && (
        <div style={s.pagination}>
          <button
            style={s.pageBtn}
            disabled={!meta.hasPrevPage}
            onClick={() => setPage((p) => p - 1)}
          >
            ← Prev
          </button>
          <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>
            Page {page} of {meta.totalPages}
          </span>
          <button
            style={s.pageBtn}
            disabled={!meta.hasNextPage}
            onClick={() => setPage((p) => p + 1)}
          >
            Next →
          </button>
        </div>
      )}

      {/* Create / Edit overlay */}
      {modalMode !== null && (
        <div style={s.overlay} onClick={() => setModalMode(null)}>
          <div style={s.overlayBox} onClick={(e) => e.stopPropagation()}>
            {/* Sticky header */}
            <div style={s.overlayHeader}>
              <span style={s.overlayTitle}>
                {modalMode === 'create' ? 'New Contract' : 'Edit Contract'}
              </span>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' as const }}>
                <button
                  style={{
                    ...s.actionBtn,
                    backgroundColor: '#6b7280',
                    color: '#fff',
                    padding: '0.4rem 0.75rem',
                  }}
                  onClick={fillDefaultTerms}
                >
                  Fill Default Terms
                </button>
                <button
                  style={{
                    ...s.actionBtn,
                    backgroundColor: '#6b7280',
                    color: '#fff',
                    padding: '0.4rem 0.75rem',
                  }}
                  onClick={() => setModalMode(null)}
                >
                  Cancel
                </button>
                <button
                  style={{
                    ...s.actionBtn,
                    backgroundColor: '#4f8ef7',
                    color: '#fff',
                    padding: '0.4rem 0.9rem',
                    opacity: saving ? 0.7 : 1,
                  }}
                  onClick={() => void handleSave()}
                  disabled={saving}
                >
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </div>

            {/* Form body */}
            <div style={s.overlayBody}>
              {formError && <div style={s.errorBanner}>{formError}</div>}

              {/* Agreement Info */}
              <div style={s.section}>
                <div style={s.sectionTitle}>Agreement Info</div>
                <div style={{ maxWidth: '260px' }}>{fldDate('Agreement Date', 'agreementDate')}</div>
              </div>

              {/* Landlord */}
              <div style={s.section}>
                <div style={s.sectionTitle}>Landlord</div>
                <div style={{ ...s.grid2, marginBottom: '0.75rem' }}>
                  {fldStr('Name', 'landlordName')}
                  {fldStr('Phone', 'landlordPhone')}
                </div>
                <div style={s.grid2}>
                  {fldStr('Email', 'landlordEmail')}
                  {fldStr('Address', 'landlordAddress')}
                </div>
              </div>

              {/* Tenant */}
              <div style={s.section}>
                <div style={s.sectionTitle}>Tenant</div>
                <div style={{ marginBottom: '0.75rem' }}>
                  <label>
                    <span style={s.label}>Select Tenant (auto-fills fields below)</span>
                    <select
                      style={s.select}
                      value={form.tenantId ?? ''}
                      onChange={(e) => void handleTenantSelect(e.target.value)}
                    >
                      <option value="">— Select tenant to auto-fill —</option>
                      {tenants.map((t) => (
                        <option key={t._id} value={t._id}>
                          {t.firstName} {t.lastName} ({t.status})
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <div style={{ ...s.grid2, marginBottom: '0.75rem' }}>
                  {fldStr('Full Name', 'tenantName')}
                  {fldStr('Phone', 'tenantPhone')}
                </div>
                <div style={{ ...s.grid2, marginBottom: '0.75rem' }}>
                  {fldStr('Email', 'tenantEmail')}
                  {fldStr('Alternate Phone', 'tenantAlternatePhone')}
                </div>
                <div style={{ maxWidth: '260px' }}>{fldStr('Qatar ID', 'tenantQatarId')}</div>
              </div>

              {/* Property */}
              <div style={s.section}>
                <div style={s.sectionTitle}>Property</div>
                <div style={{ ...s.grid2, marginBottom: '0.75rem' }}>
                  {fldStr('Property Name', 'propertyName')}
                  {fldStr('Address', 'propertyAddress')}
                </div>
                <div style={{ ...s.grid2, marginBottom: '0.75rem' }}>
                  {fldStr('City', 'propertyCity')}
                  {fldStr('State / Area', 'propertyState')}
                </div>
                <div style={{ ...s.grid2, marginBottom: '0.75rem' }}>
                  {fldStr('Zip Code', 'propertyZip')}
                  {fldStr('Property Type', 'propertyType')}
                </div>
                <div style={s.grid2}>
                  {fldNum('Bedrooms', 'propertyBedrooms')}
                  {fldNum('Bathrooms', 'propertyBathrooms')}
                </div>
                <div style={{ marginTop: '0.75rem', maxWidth: '260px' }}>
                  {fldNum('Square Feet', 'propertySquareFeet')}
                </div>
              </div>

              {/* Lease Terms */}
              <div style={s.section}>
                <div style={s.sectionTitle}>Lease Terms</div>
                <div style={{ ...s.grid2, marginBottom: '0.75rem' }}>
                  {fldDate('Lease Start', 'leaseStart')}
                  {fldDate('Lease End', 'leaseEnd')}
                </div>
                <div style={{ ...s.grid2, marginBottom: '0.75rem' }}>
                  {fldNum('Monthly Rent (QAR)', 'monthlyRent')}
                  {fldNum('Security Deposit (QAR)', 'securityDeposit')}
                </div>
                <div style={{ ...s.grid2, marginBottom: '0.75rem' }}>
                  {fldStr('Late Fee', 'lateFee')}
                  {fldStr('Return Period', 'returnPeriod')}
                </div>
                <div style={{ ...s.grid2, marginBottom: '0.75rem' }}>
                  {fldStr('Notice Period', 'noticePeriod')}
                  {fldStr('Holdover Rate', 'holdoverRate')}
                </div>
                <div style={{ ...s.grid2, marginBottom: '0.75rem' }}>
                  <label>
                    <span style={s.label}>Utilities Responsible</span>
                    <select
                      style={s.select}
                      name="utilitiesResponsible"
                      value={form.utilitiesResponsible ?? 'Tenant'}
                      onChange={handleChange}
                    >
                      <option value="Tenant">Tenant</option>
                      <option value="Landlord">Landlord</option>
                      <option value="Shared">Shared</option>
                    </select>
                  </label>
                  {fldStr('Governing Law', 'governingLaw')}
                </div>
                <div style={s.checkRow}>
                  <input
                    type="checkbox"
                    id="petsAllowed"
                    name="petsAllowed"
                    checked={form.petsAllowed}
                    onChange={handleChange}
                  />
                  <label htmlFor="petsAllowed" style={{ fontSize: '0.875rem', color: '#111' }}>
                    Pets Allowed
                  </label>
                </div>
                {form.petsAllowed && (
                  <div style={{ maxWidth: '260px', marginTop: '0.5rem' }}>
                    {fldNum('Pet Deposit (QAR)', 'petDeposit')}
                  </div>
                )}
              </div>

              {/* Terms & Conditions */}
              <div style={s.section}>
                <div style={s.sectionTitle}>Terms &amp; Conditions</div>
                <p style={{ fontSize: '0.8rem', color: '#6b7280', margin: '0 0 0.75rem' }}>
                  Click &quot;Fill Default Terms&quot; in the header to populate all fields with
                  standard boilerplate text, then edit as needed.
                </p>
                {fldTextarea('1. Rent', 'termsRent')}
                {fldTextarea('2. Security Deposit', 'termsSecurity')}
                {fldTextarea('3. Use of Property', 'termsUse')}
                {fldTextarea('4. Maintenance', 'termsMaintenance')}
                {fldTextarea('5. Utilities', 'termsUtilities')}
                {fldTextarea('6. Quiet Enjoyment', 'termsQuiet')}
                {fldTextarea('7. Right of Entry', 'termsAccess')}
                {fldTextarea('8. Pets', 'termsPets')}
                {fldTextarea('9. Insurance', 'termsInsurance')}
                {fldTextarea('10. Default', 'termsDefault')}
                {fldTextarea('11. Termination', 'termsTermination')}
                {fldTextarea('12. Holdover', 'termsHoldover')}
                {fldTextarea('13. Governing Law', 'termsGoverning')}
                {fldTextarea('14. Entire Agreement', 'termsEntire')}
                {fldTextarea('15. Severability', 'termsSeverability')}
              </div>

              {/* Emergency Contact */}
              <div style={s.section}>
                <div style={s.sectionTitle}>Emergency Contact</div>
                <div style={s.grid2}>
                  {fldStr('Name', 'emergencyContactName')}
                  {fldStr('Phone', 'emergencyContactPhone')}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div style={s.overlayFooter}>
              {formError && (
                <span style={{ color: '#ef4444', fontSize: '0.8rem', flex: 1 }}>{formError}</span>
              )}
              <button
                style={{
                  ...s.actionBtn,
                  backgroundColor: '#e5e7eb',
                  color: '#111',
                  padding: '0.5rem 1rem',
                }}
                onClick={() => setModalMode(null)}
              >
                Cancel
              </button>
              <button
                style={{
                  ...s.actionBtn,
                  backgroundColor: '#4f8ef7',
                  color: '#fff',
                  padding: '0.5rem 1rem',
                  opacity: saving ? 0.7 : 1,
                }}
                onClick={() => void handleSave()}
                disabled={saving}
              >
                {saving ? 'Saving…' : 'Save Contract'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm dialog */}
      {deleteId !== null && (
        <div style={s.dialog}>
          <div style={s.dialogBox}>
            <p style={{ margin: '0 0 0.75rem', fontWeight: 600, fontSize: '1rem' }}>
              Delete this contract?
            </p>
            <p style={{ margin: '0 0 1.5rem', fontSize: '0.875rem', color: '#6b7280' }}>
              This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button
                style={{
                  ...s.actionBtn,
                  backgroundColor: '#e5e7eb',
                  color: '#111',
                  padding: '0.5rem 1rem',
                }}
                onClick={() => setDeleteId(null)}
              >
                Cancel
              </button>
              <button
                style={{
                  ...s.actionBtn,
                  backgroundColor: '#ef4444',
                  color: '#fff',
                  padding: '0.5rem 1rem',
                }}
                onClick={() => void handleDelete()}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
