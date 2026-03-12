const CURRENCY_MINOR_UNITS: Record<string, number> = {
  USD: 2,
  COP: 0,
  EUR: 2,
  MXN: 2
};

const DEFAULT_MAX_CENTS = 999_999_999_999;

export function resolveMinorUnits(currencyCode: string): number {
  return CURRENCY_MINOR_UNITS[currencyCode.toUpperCase()] ?? 2;
}

export function toMajorUnits(currencyCode: string, minorAmount: number): number {
  return minorAmount / (10 ** resolveMinorUnits(currencyCode));
}

function normalizeMoneyInput(raw: string, fractionDigits: number): string | null {
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }
  if (trimmed.includes("-")) {
    return null;
  }

  const filtered = trimmed.replace(/[^0-9.,]/g, "");
  if (!filtered || !/[0-9]/.test(filtered)) {
    return null;
  }

  const lastDot = filtered.lastIndexOf(".");
  const lastComma = filtered.lastIndexOf(",");
  const hasDot = lastDot >= 0;
  const hasComma = lastComma >= 0;
  let decimalSeparator = "";

  if (hasDot && hasComma) {
    decimalSeparator = lastDot > lastComma ? "." : ",";
  } else if (hasDot || hasComma) {
    const separator = hasDot ? "." : ",";
    const firstIndex = filtered.indexOf(separator);
    const lastIndex = filtered.lastIndexOf(separator);
    if (firstIndex !== lastIndex) {
      decimalSeparator = "";
    } else {
      const fractionalLength = filtered.length - lastIndex - 1;
      if (fractionalLength > 0 && fractionalLength <= fractionDigits) {
        decimalSeparator = separator;
      } else {
        return null;
      }
    }
  }

  if (decimalSeparator) {
    const thousands = decimalSeparator === "." ? /,/g : /\./g;
    const withoutThousands = filtered.replace(thousands, "");
    if (withoutThousands.split(decimalSeparator).length !== 2) {
      return null;
    }
    const normalized = withoutThousands.replace(decimalSeparator, ".");
    return /^\d+(\.\d+)?$/.test(normalized) ? normalized : null;
  }

  const normalized = filtered.replace(/[.,]/g, "");
  return /^\d+$/.test(normalized) ? normalized : null;
}

export function parseMoneyInputToCents(currencyCode: string, input: string, maxCents = DEFAULT_MAX_CENTS): number | null {
  const fractionDigits = resolveMinorUnits(currencyCode);
  const normalized = normalizeMoneyInput(input, fractionDigits);
  const amountPattern = fractionDigits > 0
    ? new RegExp(`^\\d+(\\.\\d{1,${fractionDigits}})?$`)
    : /^\d+$/;
  if (!normalized || !amountPattern.test(normalized)) {
    return null;
  }

  const numeric = Number(normalized);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return null;
  }

  const cents = Math.round(numeric * (10 ** fractionDigits));
  if (!Number.isInteger(cents) || cents <= 0 || cents > maxCents) {
    return null;
  }

  return cents;
}

export function parseNonNegativeMoneyInputToCents(
  currencyCode: string,
  input: string,
  maxCents = DEFAULT_MAX_CENTS
): number | null {
  const trimmed = input.trim();
  if (!trimmed) {
    return null;
  }
  if (/^0([.,]0+)?$/.test(trimmed)) {
    return 0;
  }
  return parseMoneyInputToCents(currencyCode, trimmed, maxCents);
}

export function centsToInputValue(currencyCode: string, cents: number): string {
  const fractionDigits = resolveMinorUnits(currencyCode);
  return toMajorUnits(currencyCode, cents).toFixed(fractionDigits);
}

export function formatCents(currencyCode: string, cents: number): string {
  const fractionDigits = resolveMinorUnits(currencyCode);
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: currencyCode,
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits
  }).format(toMajorUnits(currencyCode, cents));
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
