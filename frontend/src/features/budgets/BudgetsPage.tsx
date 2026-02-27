import { type FormEvent, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";

import { archiveBudget, createBudget, updateBudget } from "@/api/budgets";
import { listCategories } from "@/api/categories";
import { ApiProblemError } from "@/api/errors";
import type { Budget, BudgetCreate, BudgetUpdate, Category, ProblemDetails } from "@/api/types";
import { useAuth } from "@/auth/useAuth";
import ConfirmDialog from "@/components/ConfirmDialog";
import ProblemDetailsInline from "@/components/errors/ProblemDetailsInline";
import PageHeader from "@/components/PageHeader";
import { useBudgetsList, invalidateBudgetCaches } from "@/features/budgets/budgetsQueries";
import BudgetFormModal, { type BudgetFormState } from "@/features/budgets/components/BudgetFormModal";
import BudgetsTable from "@/features/budgets/components/BudgetsTable";
import { centsToDecimalInput, isValidMonth, isValidMonthRange, parseLimitInputToCents } from "@/lib/budgets";
import { Button } from "@/ui/button";
import { Card, CardContent } from "@/ui/card";

const BUDGET_MONTH_INVALID_TYPE = "https://api.budgetbuddy.dev/problems/budget-month-invalid";
const MONEY_AMOUNT_PREFIX = "https://api.budgetbuddy.dev/problems/money-amount-";

type BudgetFieldErrors = {
  month?: string;
  limit?: string;
};

const EMPTY_FORM: BudgetFormState = {
  month: "",
  categoryId: "",
  limit: ""
};

function currentMonth(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

function toLocalProblem(problem: ProblemDetails): ApiProblemError {
  return new ApiProblemError(problem, {
    httpStatus: problem.status,
    requestId: null,
    retryAfter: null
  });
}

function mapFieldErrors(problem: ProblemDetails | null): BudgetFieldErrors {
  if (!problem) {
    return {};
  }
  if (problem.type === BUDGET_MONTH_INVALID_TYPE) {
    return { month: problem.detail ?? "Month must use YYYY-MM format." };
  }
  if (problem.type.startsWith(MONEY_AMOUNT_PREFIX)) {
    return { limit: problem.detail ?? "Limit must be a positive amount with up to two decimals." };
  }
  return {};
}

export default function BudgetsPage() {
  const { apiClient, user } = useAuth();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const initialMonth = useMemo(() => {
    const month = searchParams.get("month");
    if (month && isValidMonth(month)) {
      return month;
    }
    return currentMonth();
  }, [searchParams]);
  const [draftFrom, setDraftFrom] = useState(initialMonth);
  const [draftTo, setDraftTo] = useState(initialMonth);
  const [appliedRange, setAppliedRange] = useState({ from: initialMonth, to: initialMonth });
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Budget | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<Budget | null>(null);
  const [pageProblem, setPageProblem] = useState<unknown | null>(null);
  const [formProblem, setFormProblem] = useState<unknown | null>(null);
  const [formFieldErrors, setFormFieldErrors] = useState<BudgetFieldErrors>({});
  const [formState, setFormState] = useState<BudgetFormState>(EMPTY_FORM);

  const rangeIsValid = isValidMonthRange(appliedRange.from, appliedRange.to);
  const categoriesQuery = useQuery({
    queryKey: ["categories", { include_archived: false }] as const,
    queryFn: () =>
      listCategories(apiClient, {
        includeArchived: false,
        type: "all",
        limit: 100
      })
  });
  const budgetsQuery = useBudgetsList(apiClient, appliedRange, rangeIsValid);

  const saveMutation = useMutation({
    mutationFn: async (payload: BudgetCreate | BudgetUpdate) => {
      if (editing) {
        await updateBudget(apiClient, editing.id, payload as BudgetUpdate);
        return;
      }
      await createBudget(apiClient, payload as BudgetCreate);
    },
    onSuccess: async () => {
      setFormOpen(false);
      await invalidateBudgetCaches(queryClient, editing?.id);
    },
    onError: (error) => {
      const problem = error instanceof ApiProblemError ? error.problem : null;
      setFormProblem(error);
      setFormFieldErrors(mapFieldErrors(problem));
    }
  });

  const archiveMutation = useMutation({
    mutationFn: (budgetId: string) => archiveBudget(apiClient, budgetId),
    onSuccess: async () => {
      const targetId = archiveTarget?.id;
      setArchiveTarget(null);
      await invalidateBudgetCaches(queryClient, targetId);
    },
    onError: (error) => {
      setPageProblem(error);
    }
  });

  useEffect(() => {
    if (!rangeIsValid) {
      setPageProblem(toLocalProblem({
        type: "about:blank",
        title: "Invalid date range",
        status: 400,
        detail: "Use YYYY-MM and ensure from is not later than to."
      }));
      return;
    }
    if (budgetsQuery.error) {
      setPageProblem(budgetsQuery.error);
      return;
    }
    setPageProblem(null);
  }, [budgetsQuery.error, rangeIsValid]);

  function openCreateModal() {
    setEditing(null);
    setFormProblem(null);
    setFormFieldErrors({});
    setFormState({
      month: appliedRange.from,
      categoryId: "",
      limit: ""
    });
    setFormOpen(true);
  }

  function openEditModal(budget: Budget) {
    setEditing(budget);
    setFormProblem(null);
    setFormFieldErrors({});
    setFormState({
      month: budget.month,
      categoryId: budget.category_id,
      limit: centsToDecimalInput(budget.limit_cents)
    });
    setFormOpen(true);
  }

  function applyRange() {
    if (!isValidMonthRange(draftFrom, draftTo)) {
      setPageProblem(toLocalProblem({
        type: BUDGET_MONTH_INVALID_TYPE,
        title: "Invalid date range",
        status: 400,
        detail: "Use YYYY-MM and ensure from is not later than to."
      }));
      return;
    }
    setPageProblem(null);
    setAppliedRange({ from: draftFrom, to: draftTo });
  }

  function setFormField(field: keyof BudgetFormState, value: string) {
    setFormState((previous) => ({ ...previous, [field]: value }));
    setFormFieldErrors((previous) => {
      if (field === "month" && previous.month) {
        return { ...previous, month: undefined };
      }
      if (field === "limit" && previous.limit) {
        return { ...previous, limit: undefined };
      }
      return previous;
    });
  }

  function buildCreatePayload(): BudgetCreate | null {
    if (!isValidMonth(formState.month) || !formState.categoryId) {
      setFormProblem(toLocalProblem({
        type: BUDGET_MONTH_INVALID_TYPE,
        title: "Invalid request",
        status: 400,
        detail: "month and category are required and month must be YYYY-MM."
      }));
      if (!isValidMonth(formState.month)) {
        setFormFieldErrors((previous) => ({ ...previous, month: "Month must use YYYY-MM format." }));
      }
      return null;
    }
    const limitCents = parseLimitInputToCents(formState.limit);
    if (!limitCents) {
      setFormProblem(toLocalProblem({
        type: `${MONEY_AMOUNT_PREFIX}invalid`,
        title: "Invalid limit",
        status: 400,
        detail: "Limit must be a positive amount with up to two decimals."
      }));
      setFormFieldErrors((previous) => ({ ...previous, limit: "Limit must be a positive amount with up to two decimals." }));
      return null;
    }
    return {
      month: formState.month,
      category_id: formState.categoryId,
      limit_cents: limitCents
    };
  }

  function buildUpdatePayload(): BudgetUpdate | null {
    if (!editing) {
      return null;
    }
    const payload: BudgetUpdate = {};
    if (formState.month !== editing.month) {
      if (!isValidMonth(formState.month)) {
        setFormProblem(toLocalProblem({
          type: BUDGET_MONTH_INVALID_TYPE,
          title: "Invalid month",
          status: 400,
          detail: "month must use YYYY-MM format."
        }));
        setFormFieldErrors((previous) => ({ ...previous, month: "Month must use YYYY-MM format." }));
        return null;
      }
      payload.month = formState.month;
    }
    if (formState.categoryId !== editing.category_id) {
      if (!formState.categoryId) {
        setFormProblem(toLocalProblem({
          type: "about:blank",
          title: "Invalid request",
          status: 400,
          detail: "category is required."
        }));
        return null;
      }
      payload.category_id = formState.categoryId;
    }
    const parsedLimit = parseLimitInputToCents(formState.limit);
    if (!parsedLimit) {
      setFormProblem(toLocalProblem({
        type: `${MONEY_AMOUNT_PREFIX}invalid`,
        title: "Invalid limit",
        status: 400,
        detail: "Limit must be a positive amount with up to two decimals."
      }));
      setFormFieldErrors((previous) => ({ ...previous, limit: "Limit must be a positive amount with up to two decimals." }));
      return null;
    }
    if (parsedLimit !== editing.limit_cents) {
      payload.limit_cents = parsedLimit;
    }
    if (Object.keys(payload).length === 0) {
      setFormProblem(toLocalProblem({
        type: "about:blank",
        title: "No changes",
        status: 400,
        detail: "Update requires at least one changed field."
      }));
      return null;
    }
    return payload;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormProblem(null);
    setFormFieldErrors({});
    const payload = editing ? buildUpdatePayload() : buildCreatePayload();
    if (!payload) {
      return;
    }
    try {
      await saveMutation.mutateAsync(payload);
    } catch {
      // handled in mutation onError
    }
  }

  async function handleArchive() {
    if (!archiveTarget) {
      return;
    }
    setPageProblem(null);
    try {
      await archiveMutation.mutateAsync(archiveTarget.id);
    } catch {
      // handled in mutation onError
    }
  }

  const categories = categoriesQuery.data?.items ?? [];
  const categoriesById = useMemo(() => {
    const map = new Map<string, Category>();
    categories.forEach((category) => map.set(category.id, category));
    return map;
  }, [categories]);

  const currencyCode = user?.currency_code ?? "USD";
  const moneyFormatter = useMemo(
    () =>
      new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: currencyCode
      }),
    [currencyCode]
  );

  const items = budgetsQuery.data?.items ?? [];

  return (
    <section>
      <PageHeader
        title="Budgets"
        description="Manage monthly category limits with contract-safe budget operations."
        actionLabel="New budget"
        onAction={openCreateModal}
      >
        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <label className="inline-flex items-center gap-2">
            <span>From</span>
            <input
              type="month"
              className="rounded-md border bg-background px-2 py-1 text-sm"
              value={draftFrom}
              onChange={(event) => setDraftFrom(event.target.value)}
              aria-label="From month"
            />
          </label>
          <label className="inline-flex items-center gap-2">
            <span>To</span>
            <input
              type="month"
              className="rounded-md border bg-background px-2 py-1 text-sm"
              value={draftTo}
              onChange={(event) => setDraftTo(event.target.value)}
              aria-label="To month"
            />
          </label>
          <Button type="button" variant="outline" onClick={applyRange}>
            Apply
          </Button>
        </div>
      </PageHeader>

      {pageProblem ? <ProblemDetailsInline error={pageProblem} onRetry={() => void budgetsQuery.refetch()} /> : null}

      <Card>
        <CardContent className="p-0">
          {budgetsQuery.isLoading ? (
            <div className="p-4 text-sm text-muted-foreground">Loading budgets...</div>
          ) : items.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground">No budgets yet. Create one.</div>
          ) : (
            <BudgetsTable
              items={items}
              categoriesById={categoriesById}
              formatMoney={(amountCents) => moneyFormatter.format(amountCents / 100)}
              onEdit={openEditModal}
              onArchive={setArchiveTarget}
            />
          )}
        </CardContent>
      </Card>

      <BudgetFormModal
        open={formOpen}
        editing={Boolean(editing)}
        submitting={saveMutation.isPending}
        state={formState}
        categories={categories}
        problem={formProblem}
        fieldErrors={formFieldErrors}
        onClose={() => setFormOpen(false)}
        onSubmit={handleSubmit}
        onFieldChange={setFormField}
      />

      <ConfirmDialog
        open={Boolean(archiveTarget)}
        title="Archive budget?"
        description={
          archiveTarget ? `This will archive budget for ${archiveTarget.month}.` : "This action archives the selected budget."
        }
        confirmLabel="Archive"
        confirming={archiveMutation.isPending}
        onCancel={() => setArchiveTarget(null)}
        onConfirm={handleArchive}
      />
    </section>
  );
}
