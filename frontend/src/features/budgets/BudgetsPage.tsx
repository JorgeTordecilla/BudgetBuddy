import { FormEvent, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { archiveBudget, createBudget, listBudgets, updateBudget } from "@/api/budgets";
import { listCategories } from "@/api/categories";
import { mapBudgetProblem } from "@/api/problemMessages";
import { ApiProblemError } from "@/api/problem";
import type {
  Budget,
  BudgetCreate,
  BudgetUpdate,
  Category,
  ProblemDetails
} from "@/api/types";
import { useAuth } from "@/auth/useAuth";
import ConfirmDialog from "@/components/ConfirmDialog";
import ModalForm from "@/components/ModalForm";
import PageHeader from "@/components/PageHeader";
import ProblemBanner from "@/components/ProblemBanner";
import { centsToDecimalInput, isValidMonth, isValidMonthRange, parseLimitInputToCents } from "@/lib/budgets";
import { Button } from "@/ui/button";
import { Card, CardContent } from "@/ui/card";

type BudgetFormState = {
  month: string;
  categoryId: string;
  limit: string;
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

function getCategoryLabel(category: Category): string {
  return `${category.name} (${category.type})`;
}

export default function BudgetsPage() {
  const { apiClient, user } = useAuth();
  const queryClient = useQueryClient();
  const [from, setFrom] = useState(currentMonth());
  const [to, setTo] = useState(currentMonth());
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Budget | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<Budget | null>(null);
  const [pageProblem, setPageProblem] = useState<ProblemDetails | null>(null);
  const [formProblem, setFormProblem] = useState<ProblemDetails | null>(null);
  const [formState, setFormState] = useState<BudgetFormState>(EMPTY_FORM);

  const rangeIsValid = isValidMonthRange(from, to);
  const queryKey = ["budgets", { from, to }] as const;

  function toProblemDetails(error: unknown, title: string): ProblemDetails {
    if (error instanceof ApiProblemError) {
      return mapBudgetProblem(error.problem, error.status, title);
    }
    return {
      type: "about:blank",
      title,
      status: 500,
      detail: "Unexpected client error."
    };
  }

  const categoriesQuery = useQuery({
    queryKey: ["categories", { include_archived: false }] as const,
    queryFn: () =>
      listCategories(apiClient, {
        includeArchived: false,
        type: "all",
        limit: 100
      })
  });

  const budgetsQuery = useQuery({
    queryKey,
    enabled: rangeIsValid,
    queryFn: () =>
      listBudgets(apiClient, {
        from,
        to
      })
  });

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
      await queryClient.invalidateQueries({ queryKey: ["budgets"] });
      await queryClient.invalidateQueries({ queryKey: ["analytics"] });
    },
    onError: (error) => {
      setFormProblem(toProblemDetails(error, "Failed to save budget"));
    }
  });

  const archiveMutation = useMutation({
    mutationFn: (budgetId: string) => archiveBudget(apiClient, budgetId),
    onSuccess: async () => {
      setArchiveTarget(null);
      await queryClient.invalidateQueries({ queryKey: ["budgets"] });
      await queryClient.invalidateQueries({ queryKey: ["analytics"] });
    },
    onError: (error) => {
      setPageProblem(toProblemDetails(error, "Failed to archive budget"));
    }
  });

  useEffect(() => {
    if (!rangeIsValid) {
      setPageProblem({
        type: "about:blank",
        title: "Invalid date range",
        status: 400,
        detail: "Use YYYY-MM and ensure from is not later than to."
      });
      return;
    }
    if (budgetsQuery.error) {
      setPageProblem(toProblemDetails(budgetsQuery.error, "Failed to load budgets"));
      return;
    }
    setPageProblem(null);
  }, [rangeIsValid, budgetsQuery.error]);

  function openCreateModal() {
    setEditing(null);
    setFormProblem(null);
    setFormState({
      month: from,
      categoryId: "",
      limit: ""
    });
    setFormOpen(true);
  }

  function openEditModal(budget: Budget) {
    setEditing(budget);
    setFormProblem(null);
    setFormState({
      month: budget.month,
      categoryId: budget.category_id,
      limit: centsToDecimalInput(budget.limit_cents)
    });
    setFormOpen(true);
  }

  function buildCreatePayload(): BudgetCreate | null {
    if (!isValidMonth(formState.month) || !formState.categoryId) {
      setFormProblem({
        type: "about:blank",
        title: "Invalid request",
        status: 400,
        detail: "month and category are required and month must be YYYY-MM."
      });
      return null;
    }
    const limitCents = parseLimitInputToCents(formState.limit);
    if (!limitCents) {
      setFormProblem({
        type: "about:blank",
        title: "Invalid limit",
        status: 400,
        detail: "Limit must be a positive amount with up to two decimals."
      });
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
        setFormProblem({
          type: "about:blank",
          title: "Invalid month",
          status: 400,
          detail: "month must use YYYY-MM format."
        });
        return null;
      }
      payload.month = formState.month;
    }
    if (formState.categoryId !== editing.category_id) {
      if (!formState.categoryId) {
        setFormProblem({
          type: "about:blank",
          title: "Invalid request",
          status: 400,
          detail: "category is required."
        });
        return null;
      }
      payload.category_id = formState.categoryId;
    }
    const parsedLimit = parseLimitInputToCents(formState.limit);
    if (!parsedLimit) {
      setFormProblem({
        type: "about:blank",
        title: "Invalid limit",
        status: 400,
        detail: "Limit must be a positive amount with up to two decimals."
      });
      return null;
    }
    if (parsedLimit !== editing.limit_cents) {
      payload.limit_cents = parsedLimit;
    }
    if (Object.keys(payload).length === 0) {
      setFormProblem({
        type: "about:blank",
        title: "No changes",
        status: 400,
        detail: "Update requires at least one changed field."
      });
      return null;
    }
    return payload;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormProblem(null);
    const payload = editing ? buildUpdatePayload() : buildCreatePayload();
    if (!payload) {
      return;
    }
    try {
      await saveMutation.mutateAsync(payload);
    } catch {
      // handled in onError
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
      // handled in onError
    }
  }

  const categories = categoriesQuery.data?.items ?? [];
  const categoryMap = useMemo(() => {
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
        <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
          <label className="inline-flex items-center gap-2">
            <span>From</span>
            <input
              type="month"
              className="rounded-md border bg-background px-2 py-1 text-sm"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
              aria-label="From month"
            />
          </label>
          <label className="inline-flex items-center gap-2">
            <span>To</span>
            <input
              type="month"
              className="rounded-md border bg-background px-2 py-1 text-sm"
              value={to}
              onChange={(event) => setTo(event.target.value)}
              aria-label="To month"
            />
          </label>
        </div>
      </PageHeader>

      <ProblemBanner problem={pageProblem} onClose={() => setPageProblem(null)} />

      <Card>
        <CardContent className="p-0">
          {budgetsQuery.isLoading ? (
            <div className="p-4 text-sm text-muted-foreground">Loading budgets...</div>
          ) : items.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground">No budgets found for selected range.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-[760px] w-full text-sm">
                <thead className="bg-muted/50 text-left">
                  <tr>
                    <th className="px-3 py-2">Month</th>
                    <th className="px-3 py-2">Category</th>
                    <th className="px-3 py-2 text-right">Limit</th>
                    <th className="px-3 py-2">State</th>
                    <th className="px-3 py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((budget) => {
                    const category = categoryMap.get(budget.category_id);
                    return (
                      <tr key={budget.id} className="border-t">
                        <td className="px-3 py-2">{budget.month}</td>
                        <td className="px-3 py-2">
                          {category ? getCategoryLabel(category) : budget.category_id}
                        </td>
                        <td className="px-3 py-2 text-right">{moneyFormatter.format(budget.limit_cents / 100)}</td>
                        <td className="px-3 py-2">{budget.archived_at ? "Archived" : "Active"}</td>
                        <td className="px-3 py-2 text-right">
                          <div className="flex flex-wrap justify-end gap-2">
                            <Button type="button" variant="outline" size="sm" onClick={() => openEditModal(budget)}>
                              Edit
                            </Button>
                            {!budget.archived_at ? (
                              <Button type="button" size="sm" onClick={() => setArchiveTarget(budget)}>
                                Archive
                              </Button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <ModalForm
        open={formOpen}
        title={editing ? "Edit budget" : "Create budget"}
        description="Budget limits are sent as integer cents."
        submitLabel={editing ? "Save changes" : "Create budget"}
        submitting={saveMutation.isPending}
        onClose={() => setFormOpen(false)}
        onSubmit={handleSubmit}
      >
        <div className="grid gap-3">
          <label className="space-y-1 text-sm">
            <span>Month</span>
            <input
              type="month"
              className="w-full rounded-md border px-3 py-2"
              value={formState.month}
              onChange={(event) => setFormState((previous) => ({ ...previous, month: event.target.value }))}
            />
          </label>
          <label className="space-y-1 text-sm">
            <span>Category</span>
            <select
              className="w-full rounded-md border px-3 py-2"
              value={formState.categoryId}
              onChange={(event) => setFormState((previous) => ({ ...previous, categoryId: event.target.value }))}
            >
              <option value="">Select category</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {getCategoryLabel(category)}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-sm">
            <span>Limit</span>
            <input
              className="w-full rounded-md border px-3 py-2"
              value={formState.limit}
              onChange={(event) => setFormState((previous) => ({ ...previous, limit: event.target.value }))}
              placeholder="0.00"
              inputMode="decimal"
            />
          </label>
          <ProblemBanner problem={formProblem} onClose={() => setFormProblem(null)} />
        </div>
      </ModalForm>

      <ConfirmDialog
        open={Boolean(archiveTarget)}
        title="Archive budget?"
        description={archiveTarget ? `This will archive budget for ${archiveTarget.month}.` : "This action archives the selected budget."}
        confirmLabel="Archive"
        confirming={archiveMutation.isPending}
        onCancel={() => setArchiveTarget(null)}
        onConfirm={handleArchive}
      />
    </section>
  );
}
