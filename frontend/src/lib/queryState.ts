import type { TransactionType } from "@/api/types";

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

export function normalizeIsoDateParam(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }
  return ISO_DATE_PATTERN.test(value) ? value : null;
}

export function normalizeMonthParam(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }
  return MONTH_PATTERN.test(value) ? value : null;
}

export function normalizeTransactionTypeParam(value: string | null | undefined): TransactionType | "all" {
  return value === "income" || value === "expense" ? value : "all";
}

export function normalizeIdParam(value: string | null | undefined): string {
  return value?.trim() ?? "";
}

export function normalizeBooleanParam(value: string | null | undefined): boolean {
  return value === "1" || value === "true";
}
