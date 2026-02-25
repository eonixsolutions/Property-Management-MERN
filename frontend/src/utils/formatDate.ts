/**
 * Date formatting utilities.
 *
 * The original PHP system stored dates as MySQL DATE strings (YYYY-MM-DD)
 * and displayed them in dd/mm/yyyy format with Arabic locale support.
 *
 * These utilities replicate that behaviour for the MERN frontend.
 */

/**
 * Format a date value (Date | ISO string | epoch ms) as dd/mm/yyyy.
 *
 * @example
 * formatDate('2024-03-15')        → '15/03/2024'
 * formatDate(new Date())          → '22/02/2026'
 */
export function formatDate(value: Date | string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return '—';

  const d = value instanceof Date ? value : new Date(value);

  if (isNaN(d.getTime())) return '—';

  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();

  return `${dd}/${mm}/${yyyy}`;
}

/**
 * Format a date as "15 Mar 2024" (human-readable, locale-aware).
 *
 * @example
 * formatDateLong('2024-03-15') → '15 Mar 2024'
 */
export function formatDateLong(value: Date | string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return '—';

  const d = value instanceof Date ? value : new Date(value);

  if (isNaN(d.getTime())) return '—';

  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Format a date + time as "15/03/2024, 09:30".
 *
 * @example
 * formatDateTime('2024-03-15T09:30:00Z') → '15/03/2024, 09:30'
 */
export function formatDateTime(value: Date | string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return '—';

  const d = value instanceof Date ? value : new Date(value);

  if (isNaN(d.getTime())) return '—';

  const datePart = formatDate(d);
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');

  return `${datePart}, ${hh}:${min}`;
}

/**
 * Parse a dd/mm/yyyy string to a Date object.
 * Returns null on invalid input.
 *
 * @example
 * parseDateDMY('15/03/2024') → Date(2024-03-15)
 */
export function parseDateDMY(value: string): Date | null {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  if (!match) return null;

  const [, dd, mm, yyyy] = match;
  const d = new Date(`${yyyy}-${mm}-${dd}`);

  return isNaN(d.getTime()) ? null : d;
}

/**
 * Convert a Date to an ISO date string (YYYY-MM-DD) for API payloads.
 *
 * @example
 * toISODate(new Date('2024-03-15')) → '2024-03-15'
 */
export function toISODate(value: Date | null | undefined): string {
  if (!value || isNaN(value.getTime())) return '';
  return value.toISOString().split('T')[0] ?? '';
}
