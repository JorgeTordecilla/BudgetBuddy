import type { TransactionCreate, TransactionImportMode, TransactionImportRequest } from "@/api/types";
import type { TransactionType } from "@/api/types";

const MAX_INPUT_BYTES = 1_500_000;
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export type ParseImportResult = {
  ok: boolean;
  payload: TransactionImportRequest | null;
  errors: string[];
  warning: string | null;
};

function inputByteLength(value: string): number {
  if (typeof TextEncoder !== "undefined") {
    return new TextEncoder().encode(value).length;
  }
  return value.length;
}

function isImportMode(value: unknown): value is TransactionImportMode {
  return value === "partial" || value === "all_or_nothing";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validateItems(items: unknown[]): { validItems: TransactionCreate[]; errors: string[] } {
  const errors: string[] = [];
  const validItems: TransactionCreate[] = [];

  items.forEach((item, index) => {
    if (!isRecord(item)) {
      errors.push(`Item ${index}: must be an object.`);
      return;
    }

    const type = item.type;
    const accountId = item.account_id;
    const categoryId = item.category_id;
    const amountCents = item.amount_cents;
    const date = item.date;

    if (type !== "income" && type !== "expense") {
      errors.push(`Item ${index}: type must be income or expense.`);
    }
    if (typeof accountId !== "string" || accountId.trim() === "") {
      errors.push(`Item ${index}: account_id is required.`);
    }
    if (typeof categoryId !== "string" || categoryId.trim() === "") {
      errors.push(`Item ${index}: category_id is required.`);
    }
    if (!Number.isInteger(amountCents) || Number(amountCents) <= 0) {
      errors.push(`Item ${index}: amount_cents must be an integer greater than zero.`);
    }
    if (typeof date !== "string" || !ISO_DATE_PATTERN.test(date)) {
      errors.push(`Item ${index}: date must use YYYY-MM-DD format.`);
    }

    const hasItemError = errors.some((entry) => entry.startsWith(`Item ${index}:`));
    if (hasItemError) {
      return;
    }

    const normalized: TransactionCreate = {
      type: type as TransactionType,
      account_id: accountId as string,
      category_id: categoryId as string,
      amount_cents: Number(amountCents),
      date: date as string
    };

    if (typeof item.merchant === "string") {
      normalized.merchant = item.merchant;
    }
    if (typeof item.note === "string") {
      normalized.note = item.note;
    }

    validItems.push(normalized);
  });

  return { validItems, errors };
}

export function parseImportInput(rawInput: string, selectedMode: TransactionImportMode): ParseImportResult {
  const trimmed = rawInput.trim();
  if (!trimmed) {
    return {
      ok: false,
      payload: null,
      errors: ["Input is empty. Paste JSON before importing."],
      warning: null
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return {
      ok: false,
      payload: null,
      errors: ["Invalid JSON input."],
      warning: null
    };
  }

  let mode: TransactionImportMode = selectedMode;
  let rawItems: unknown[] | null = null;

  if (Array.isArray(parsed)) {
    rawItems = parsed;
  } else if (isRecord(parsed)) {
    if (!Array.isArray(parsed.items)) {
      return {
        ok: false,
        payload: null,
        errors: ["Input object must include an items array."],
        warning: null
      };
    }

    if (parsed.mode !== undefined) {
      if (!isImportMode(parsed.mode)) {
        return {
          ok: false,
          payload: null,
          errors: ["mode must be partial or all_or_nothing."],
          warning: null
        };
      }
      mode = parsed.mode;
    }

    rawItems = parsed.items;
  } else {
    return {
      ok: false,
      payload: null,
      errors: ["Input must be a JSON array or object."],
      warning: null
    };
  }

  if (!rawItems || rawItems.length === 0) {
    return {
      ok: false,
      payload: null,
      errors: ["items must contain at least one transaction."],
      warning: null
    };
  }

  const { validItems, errors } = validateItems(rawItems);
  if (errors.length > 0 || validItems.length === 0) {
    return {
      ok: false,
      payload: null,
      errors,
      warning: null
    };
  }

  const warning = inputByteLength(rawInput) > MAX_INPUT_BYTES
    ? "Input is large and may take longer to import."
    : null;

  return {
    ok: true,
    payload: { mode, items: validItems },
    errors: [],
    warning
  };
}
