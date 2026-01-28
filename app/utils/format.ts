/**
 * Format Utilities
 * =================
 * Locale-independent formatting functions to prevent SSR hydration mismatches.
 * These functions produce consistent output on both server and client.
 */

/**
 * Format a number with commas for thousands separators.
 * Uses string manipulation instead of toLocaleString() to prevent hydration mismatch.
 * Handles null/undefined safely.
 *
 * @example formatNumber(1234567) // "1,234,567"
 */
export function formatNumber(num: number | null | undefined): string {
  if (num == null || isNaN(num)) return "0";
  const [integer, decimal] = num.toString().split(".");
  const formatted = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return decimal ? `${formatted}.${decimal}` : formatted;
}

/**
 * Format a number as currency (USD).
 * Uses fixed format to prevent hydration mismatch.
 * Handles null/undefined safely.
 *
 * @example formatCurrency(1234.56) // "$1,234.56"
 */
export function formatCurrency(value: number | null | undefined): string {
  if (value == null || isNaN(value)) return "$0.00";
  const fixed = value.toFixed(2);
  const [integer, decimal] = fixed.split(".");
  const formattedInteger = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `$${formattedInteger}.${decimal}`;
}

/**
 * Get weekday abbreviation from ISO date string.
 * Uses UTC to ensure consistency between server and client.
 *
 * @example getWeekdayShort("2025-01-20") // "Mon"
 */
export function getWeekdayShort(dateStr: string): string {
  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const date = new Date(dateStr + "T00:00:00Z"); // Use UTC to ensure consistency
  return weekdays[date.getUTCDay()];
}

/**
 * Format percentage with fixed decimal places.
 *
 * @example formatPercent(12.456, 1) // "12.5%"
 */
export function formatPercent(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Format a date string to a simple readable format.
 * Uses UTC to ensure consistency between server and client.
 *
 * @example formatDateShort("2025-01-20") // "Jan 20"
 */
export function formatDateShort(dateStr: string): string {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const date = new Date(dateStr + "T00:00:00Z");
  return `${months[date.getUTCMonth()]} ${date.getUTCDate()}`;
}
