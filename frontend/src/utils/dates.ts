function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function toLocalIsoDate(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

export function currentIsoMonth(date = new Date()): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}`;
}

export function todayIsoDate(date = new Date()): string {
  return toLocalIsoDate(date);
}

export function monthStartIsoDate(date = new Date()): string {
  return `${currentIsoMonth(date)}-01`;
}

export function defaultAnalyticsRange(now = new Date()): { from: string; to: string } {
  return {
    from: monthStartIsoDate(now),
    to: todayIsoDate(now)
  };
}

export function isValidIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const date = new Date(`${value}T00:00:00`);
  return !Number.isNaN(date.getTime()) && toLocalIsoDate(date) === value;
}

export function isValidDateRange(from: string, to: string): boolean {
  if (!isValidIsoDate(from) || !isValidIsoDate(to)) {
    return false;
  }
  return from <= to;
}
