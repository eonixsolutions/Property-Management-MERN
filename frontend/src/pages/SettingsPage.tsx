import { useState, useEffect, useRef } from 'react';
import type { AxiosError } from 'axios';
import { settingsApi } from '@api/settings.api';

// ── Currency & timezone options ───────────────────────────────────────────────

const CURRENCIES: { code: string; label: string }[] = [
  { code: 'QAR', label: 'QAR — Qatari Riyal (ر.ق)' },
  { code: 'SAR', label: 'SAR — Saudi Riyal (ر.س)' },
  { code: 'AED', label: 'AED — UAE Dirham (د.إ)' },
  { code: 'BHD', label: 'BHD — Bahraini Dinar (.د.ب)' },
  { code: 'KWD', label: 'KWD — Kuwaiti Dinar (د.ك)' },
  { code: 'OMR', label: 'OMR — Omani Rial (ر.ع.)' },
  { code: 'USD', label: 'USD — US Dollar ($)' },
  { code: 'EUR', label: 'EUR — Euro (€)' },
  { code: 'GBP', label: 'GBP — British Pound (£)' },
  { code: 'CAD', label: 'CAD — Canadian Dollar (C$)' },
  { code: 'AUD', label: 'AUD — Australian Dollar (A$)' },
  { code: 'JPY', label: 'JPY — Japanese Yen (¥)' },
  { code: 'INR', label: 'INR — Indian Rupee (₹)' },
  { code: 'PKR', label: 'PKR — Pakistani Rupee (₨)' },
  { code: 'EGP', label: 'EGP — Egyptian Pound (E£)' },
];

const TIMEZONES: { zone: string; label: string }[] = [
  { zone: 'Asia/Qatar', label: 'Asia/Qatar (UTC+3)' },
  { zone: 'Asia/Dubai', label: 'Asia/Dubai (UTC+4)' },
  { zone: 'Asia/Riyadh', label: 'Asia/Riyadh (UTC+3)' },
  { zone: 'Asia/Bahrain', label: 'Asia/Bahrain (UTC+3)' },
  { zone: 'Asia/Kuwait', label: 'Asia/Kuwait (UTC+3)' },
  { zone: 'Asia/Muscat', label: 'Asia/Muscat (UTC+4)' },
  { zone: 'Asia/Karachi', label: 'Asia/Karachi (UTC+5)' },
  { zone: 'Asia/Kolkata', label: 'Asia/Kolkata (UTC+5:30)' },
  { zone: 'Europe/London', label: 'Europe/London (UTC+0/+1)' },
  { zone: 'UTC', label: 'UTC (UTC+0)' },
];

// ── Styles ────────────────────────────────────────────────────────────────────

const s = {
  page: { padding: '1.5rem', maxWidth: '560px' },
  title: { fontSize: '1.3rem', fontWeight: 700, color: '#1a1a2e', marginBottom: '1.5rem' },
  card: { backgroundColor: '#fff', borderRadius: '8px', padding: '1.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' },
  sectionTitle: { fontSize: '0.9rem', fontWeight: 600, color: '#374151', marginBottom: '1.25rem', paddingBottom: '0.5rem', borderBottom: '1px solid #f3f4f6' },
  field: { marginBottom: '1.1rem' },
  label: { display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: '0.35rem' },
  select: { width: '100%', padding: '0.55rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '0.875rem', color: '#111', backgroundColor: '#fff', boxSizing: 'border-box' as const },
  actions: { display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '1.5rem' },
  saveBtn: { padding: '0.55rem 1.25rem', backgroundColor: '#4f8ef7', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer' },
  saveBtnDisabled: { opacity: 0.7, cursor: 'not-allowed' as const },
  errorBanner: { backgroundColor: '#fee2e2', border: '1px solid #fca5a5', color: '#991b1b', borderRadius: '4px', padding: '0.6rem 0.75rem', fontSize: '0.8rem', marginBottom: '1rem' },
  successMsg: { fontSize: '0.85rem', color: '#065f46', backgroundColor: '#d1fae5', border: '1px solid #6ee7b7', borderRadius: '4px', padding: '0.5rem 0.75rem' },
  loading: { color: '#6b7280', fontSize: '0.875rem' },
} as const;

// ── Helpers ───────────────────────────────────────────────────────────────────

function resolveError(err: unknown): string {
  const e = err as AxiosError<{ error?: { message?: string } }>;
  return e.response?.data?.error?.message ?? 'Failed to save settings. Please try again.';
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [currency, setCurrency] = useState('QAR');
  const [timezone, setTimezone] = useState('Asia/Qatar');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load current settings on mount
  useEffect(() => {
    void (async () => {
      try {
        const settings = await settingsApi.get();
        setCurrency(settings.currency);
        setTimezone(settings.timezone);
      } catch {
        setError('Failed to load settings.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Cleanup success timer on unmount
  useEffect(() => {
    return () => {
      if (successTimerRef.current !== null) clearTimeout(successTimerRef.current);
    };
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setSaving(true);

    try {
      await settingsApi.update({ currency, timezone });
      setSuccessMsg('Settings saved successfully.');
      // Auto-dismiss after 3 seconds
      successTimerRef.current = setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setError(resolveError(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={s.page}>
      <h1 style={s.title}>Settings</h1>

      {loading ? (
        <p style={s.loading}>Loading…</p>
      ) : (
        <div style={s.card}>
          <div style={s.sectionTitle}>Display Preferences</div>

          {error && <div style={s.errorBanner}>{error}</div>}

          <form onSubmit={(e) => void handleSave(e)}>
            <div style={s.field}>
              <label style={s.label} htmlFor="s-currency">
                Currency
              </label>
              <select
                id="s-currency"
                style={s.select}
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                disabled={saving}
              >
                {CURRENCIES.map(({ code, label }) => (
                  <option key={code} value={code}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div style={s.field}>
              <label style={s.label} htmlFor="s-timezone">
                Timezone
              </label>
              <select
                id="s-timezone"
                style={s.select}
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                disabled={saving}
              >
                {TIMEZONES.map(({ zone, label }) => (
                  <option key={zone} value={zone}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div style={s.actions}>
              <button
                style={{ ...s.saveBtn, ...(saving ? s.saveBtnDisabled : {}) }}
                type="submit"
                disabled={saving}
              >
                {saving ? 'Saving…' : 'Save Settings'}
              </button>
              {successMsg && <span style={s.successMsg}>{successMsg}</span>}
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
