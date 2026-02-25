/**
 * Currency formatting utilities.
 *
 * Mirrors the PHP helper logic from real-cpanel-prov1:
 *   - Arabic Gulf currencies (QAR, SAR, AED, BHD, KWD, OMR) display the
 *     symbol AFTER the number (RTL convention used in the original system).
 *   - All other currencies display the symbol BEFORE the number.
 *
 * Uses the browser's Intl.NumberFormat for locale-aware number formatting
 * so thousands separators and decimal places are handled correctly.
 */

/** Currencies whose symbol is placed after the number (Gulf RTL convention) */
const RTL_CURRENCIES = new Set(['QAR', 'SAR', 'AED', 'BHD', 'KWD', 'OMR']);

const CURRENCY_SYMBOLS: Record<string, string> = {
  QAR: 'QAR',
  SAR: 'SAR',
  AED: 'AED',
  BHD: 'BHD',
  KWD: 'KWD',
  OMR: 'OMR',
  USD: '$',
  EUR: '€',
  GBP: '£',
  INR: '₹',
  EGP: 'EGP',
  JOD: 'JOD',
};

/**
 * Format a numeric amount as a currency string.
 *
 * @param amount  - The numeric value to format
 * @param currency - ISO 4217 currency code (default: 'QAR')
 * @param decimals - Number of decimal places (default: 2)
 *
 * @example
 * formatCurrency(15000, 'QAR')  → '15,000.00 QAR'
 * formatCurrency(99.5, 'USD')   → '$99.50'
 * formatCurrency(1234, 'AED')   → '1,234.00 AED'
 */
export function formatCurrency(
  amount: number,
  currency: string = 'QAR',
  decimals: number = 2,
): string {
  const code = currency.toUpperCase();
  const symbol = CURRENCY_SYMBOLS[code] ?? code;

  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount);

  return RTL_CURRENCIES.has(code) ? `${formatted} ${symbol}` : `${symbol}${formatted}`;
}

/**
 * Parse a currency string back to a number.
 * Strips symbol, spaces, and thousands separators.
 *
 * @example
 * parseCurrency('15,000.00 QAR') → 15000
 * parseCurrency('$99.50')        → 99.5
 */
export function parseCurrency(value: string): number {
  const cleaned = value.replace(/[^0-9.-]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}
