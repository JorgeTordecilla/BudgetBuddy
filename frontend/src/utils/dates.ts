export function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function monthStartIsoDate(date = new Date()): string {
  const utc = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
  return utc.toISOString().slice(0, 10);
}

export function defaultAnalyticsRange(): { from: string; to: string } {
  const now = new Date();
  return {
    from: monthStartIsoDate(now),
    to: todayIsoDate()
  };
}

export function isValidIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}

export function isValidDateRange(from: string, to: string): boolean {
  if (!isValidIsoDate(from) || !isValidIsoDate(to)) {
    return false;
  }
  return from <= to;
}
