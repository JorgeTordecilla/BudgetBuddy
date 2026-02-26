export function formatCents(currencyCode: string, cents: number): string {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: currencyCode
  }).format(cents / 100);
}

export function centsToDecimalString(cents: number): string {
  return (cents / 100).toFixed(2);
}

export function budgetUsagePercent(spentCents: number, limitCents: number): number | null {
  if (!Number.isFinite(limitCents) || limitCents <= 0) {
    return null;
  }
  return Math.max(0, Math.round((spentCents / limitCents) * 100));
}
