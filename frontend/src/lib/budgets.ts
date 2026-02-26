const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;
const MAX_LIMIT_CENTS = 999_999_999_999;

export function isValidMonth(value: string): boolean {
  return MONTH_PATTERN.test(value);
}

export function isValidMonthRange(from: string, to: string): boolean {
  if (!isValidMonth(from) || !isValidMonth(to)) {
    return false;
  }
  return from <= to;
}

export function parseLimitInputToCents(value: string): number | null {
  const normalized = value.trim();
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) {
    return null;
  }
  const numeric = Number(normalized);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return null;
  }
  const cents = Math.round(numeric * 100);
  if (!Number.isInteger(cents) || cents <= 0 || cents > MAX_LIMIT_CENTS) {
    return null;
  }
  return cents;
}

export function centsToDecimalInput(cents: number): string {
  return (cents / 100).toFixed(2);
}
