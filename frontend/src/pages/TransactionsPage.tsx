import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";

import { listAccounts } from "@/api/accounts";
import { listCategories } from "@/api/categories";
import { ApiProblemError } from "@/api/errors";
import {
  archiveTransaction,
  createTransaction,
  exportTransactionsCsv,
  listTransactions,
  restoreTransaction,
  updateTransaction
} from "@/api/transactions";
import type {
  ProblemDetails,
  Transaction,
  TransactionCreate,
  TransactionType,
  TransactionUpdate
} from "@/api/types";
import { useAuth } from "@/auth/useAuth";
import ConfirmDialog from "@/components/ConfirmDialog";
import ProblemDetailsInline from "@/components/errors/ProblemDetailsInline";
import PageHeader from "@/components/PageHeader";
import TransactionForm, { type TransactionFormState } from "@/components/transactions/TransactionForm";
import TransactionRowActions from "@/components/transactions/TransactionRowActions";
import { invalidateTransactionsAndAnalytics } from "@/features/transactions/transactionCache";
import { appendCursorPage } from "@/lib/pagination";
import { useIsDesktop } from "@/hooks/useIsDesktop";
import {
  normalizeBooleanParam,
  normalizeIdParam,
  normalizeIsoDateParam,
  normalizeTransactionTypeParam
} from "@/lib/queryState";
import { Button } from "@/ui/button";
import { Card, CardContent } from "@/ui/card";
import { defaultAnalyticsRange } from "@/utils/dates";
import { downloadBlob, resolveCsvFilename } from "@/utils/download";

const EMPTY_FORM: TransactionFormState = {
  type: "expense",
  accountId: "",
  categoryId: "",
  amountCents: "",
  date: "",
  merchant: "",
  note: ""
};

type TransactionFilters = {
  type: TransactionType | "all";
  accountId: string;
  categoryId: string;
  from: string;
  to: string;
  includeArchived: boolean;
};

const defaultRange = defaultAnalyticsRange();

const DEFAULT_FILTERS: TransactionFilters = {
  type: "all",
  accountId: "",
  categoryId: "",
  from: defaultRange.from,
  to: defaultRange.to,
  includeArchived: false
};

function parseFiltersFromSearchParams(searchParams: URLSearchParams): TransactionFilters {
  const fromParam = normalizeIsoDateParam(searchParams.get("from"));
  const toParam = normalizeIsoDateParam(searchParams.get("to"));
  let from = fromParam ?? DEFAULT_FILTERS.from;
  let to = toParam ?? DEFAULT_FILTERS.to;
  if (from > to) {
    if (fromParam && !toParam) {
      to = fromParam;
    } else if (!fromParam && toParam) {
      from = toParam;
    } else {
      from = DEFAULT_FILTERS.from;
      to = DEFAULT_FILTERS.to;
    }
  }
  return {
    ...DEFAULT_FILTERS,
    type: normalizeTransactionTypeParam(searchParams.get("type")),
    accountId: normalizeIdParam(searchParams.get("account_id")),
    categoryId: normalizeIdParam(searchParams.get("category_id")),
    from,
    to,
    includeArchived: normalizeBooleanParam(searchParams.get("include_archived"))
  };
}

function areFiltersEqual(left: TransactionFilters, right: TransactionFilters): boolean {
  return (
    left.type === right.type &&
    left.accountId === right.accountId &&
    left.categoryId === right.categoryId &&
    left.from === right.from &&
    left.to === right.to &&
    left.includeArchived === right.includeArchived
  );
}

function toSearchParams(filters: TransactionFilters): URLSearchParams {
  const next = new URLSearchParams();
  if (filters.type !== "all") {
    next.set("type", filters.type);
  }
  if (filters.accountId) {
    next.set("account_id", filters.accountId);
  }
  if (filters.categoryId) {
    next.set("category_id", filters.categoryId);
  }
  if (filters.from) {
    next.set("from", filters.from);
  }
  if (filters.to) {
    next.set("to", filters.to);
  }
  if (filters.includeArchived) {
    next.set("include_archived", "true");
  }
  return next;
}

function dedupeById(items: Transaction[]): Transaction[] {
  const map = new Map<string, Transaction>();
  items.forEach((item) => map.set(item.id, item));
  return [...map.values()];
}

function normalizeOptional(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export default function TransactionsPage() {
  const { apiClient, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const initialFilters = useMemo<TransactionFilters>(() => parseFiltersFromSearchParams(searchParams), [searchParams]);
  const [filters, setFilters] = useState<TransactionFilters>(initialFilters);
  const [items, setItems] = useState<Transaction[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [pageProblem, setPageProblem] = useState<unknown | null>(null);
  const [formProblem, setFormProblem] = useState<unknown | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<Transaction | null>(null);
  const [formState, setFormState] = useState<TransactionFormState>(EMPTY_FORM);
  const [moreActionsOpen, setMoreActionsOpen] = useState(false);
  const moreActionsRef = useRef<HTMLDivElement | null>(null);
  const isDesktop = useIsDesktop();

  const hasMore = Boolean(nextCursor);
  const isEditing = Boolean(editing);
  const queryKey = [
    "transactions",
    filters.type,
    filters.accountId,
    filters.categoryId,
    filters.from,
    filters.to,
    filters.includeArchived
  ] as const;
  const isDateRangeInvalid = Boolean(filters.from && filters.to && filters.from > filters.to);

  function toLocalProblem(problem: ProblemDetails): ApiProblemError {
    return new ApiProblemError(problem, {
      httpStatus: problem.status,
      requestId: null,
      retryAfter: null
    });
  }

  const accountsQuery = useQuery({
    queryKey: ["accounts-options"],
    meta: { skipGlobalErrorToast: true },
    queryFn: () =>
      listAccounts(apiClient, {
        includeArchived: false,
        limit: 100
      })
  });

  const categoriesQuery = useQuery({
    queryKey: ["categories-options"],
    meta: { skipGlobalErrorToast: true },
    queryFn: () =>
      listCategories(apiClient, {
        includeArchived: false,
        type: "all",
        limit: 100
      })
  });

  const transactionsQuery = useQuery({
    queryKey,
    enabled: !isDateRangeInvalid,
    meta: { skipGlobalErrorToast: true },
    queryFn: () =>
      listTransactions(apiClient, {
        includeArchived: filters.includeArchived,
        type: filters.type,
        accountId: filters.accountId || undefined,
        categoryId: filters.categoryId || undefined,
        from: filters.from || undefined,
        to: filters.to || undefined,
        limit: 20
      })
  });

  const loadMoreMutation = useMutation({
    meta: { skipGlobalErrorToast: true },
    mutationFn: (cursor: string) =>
      listTransactions(apiClient, {
        includeArchived: filters.includeArchived,
        type: filters.type,
        accountId: filters.accountId || undefined,
        categoryId: filters.categoryId || undefined,
        from: filters.from || undefined,
        to: filters.to || undefined,
        cursor,
        limit: 20
      }),
    onSuccess: (response) => {
      const merged = appendCursorPage({ items, nextCursor }, { items: response.items, nextCursor: response.next_cursor });
      setItems(dedupeById(merged.items));
      setNextCursor(response.next_cursor);
    },
    onError: (error) => {
      setPageProblem(error);
    }
  });

  const saveMutation = useMutation({
    meta: { skipGlobalErrorToast: true },
    mutationFn: async (payload: TransactionCreate | TransactionUpdate) => {
      if (editing) {
        await updateTransaction(apiClient, editing.id, payload);
        return;
      }
      await createTransaction(apiClient, payload as TransactionCreate);
    },
    onSuccess: async () => {
      setFormOpen(false);
      await invalidateTransactionsAndAnalytics(queryClient);
    },
    onError: (error) => {
      setFormProblem(error);
    }
  });

  const archiveMutation = useMutation({
    meta: { skipGlobalErrorToast: true },
    mutationFn: (transactionId: string) => archiveTransaction(apiClient, transactionId),
    onSuccess: async () => {
      setArchiveTarget(null);
      await invalidateTransactionsAndAnalytics(queryClient);
    },
    onError: (error) => {
      setPageProblem(error);
    }
  });

  const restoreMutation = useMutation({
    meta: { skipGlobalErrorToast: true },
    mutationFn: (transactionId: string) => restoreTransaction(apiClient, transactionId),
    onSuccess: async () => {
      await invalidateTransactionsAndAnalytics(queryClient);
    },
    onError: (error) => {
      setPageProblem(error);
    }
  });

  const exportMutation = useMutation({
    meta: { skipGlobalErrorToast: true },
    mutationFn: () =>
      exportTransactionsCsv(apiClient, {
        type: filters.type,
        accountId: filters.accountId || undefined,
        categoryId: filters.categoryId || undefined,
        from: filters.from || undefined,
        to: filters.to || undefined
      }),
    onSuccess: ({ blob, contentDisposition }) => {
      const filename = resolveCsvFilename(contentDisposition);
      downloadBlob(blob, filename);
      setPageProblem(null);
      setMoreActionsOpen(false);
    },
    onError: (error) => {
      setPageProblem(error);
    }
  });

  useEffect(() => {
    setFilters((previous) => (areFiltersEqual(previous, initialFilters) ? previous : initialFilters));
  }, [initialFilters]);

  useEffect(() => {
    if (searchParams.get("action") !== "new") {
      return;
    }
    openCreateModal();
    const next = new URLSearchParams(searchParams);
    next.delete("action");
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    if (isDateRangeInvalid) {
      return;
    }
    const next = toSearchParams(filters);
    const nextEncoded = next.toString();
    const currentEncoded = searchParams.toString();
    if (nextEncoded !== currentEncoded) {
      setSearchParams(next, { replace: true });
    }
  }, [filters, isDateRangeInvalid, searchParams, setSearchParams]);

  useEffect(() => {
    if (transactionsQuery.data) {
      setItems(transactionsQuery.data.items);
      setNextCursor(transactionsQuery.data.next_cursor);
      setPageProblem(null);
    }
  }, [transactionsQuery.data]);

  useEffect(() => {
    if (transactionsQuery.error) {
      setPageProblem(transactionsQuery.error);
    }
  }, [transactionsQuery.error]);

  useEffect(() => {
    setPageProblem(null);
  }, [filters]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!moreActionsRef.current) {
        return;
      }
      const target = event.target;
      if (target instanceof Node && !moreActionsRef.current.contains(target)) {
        setMoreActionsOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMoreActionsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  function setField(field: keyof TransactionFormState, value: string) {
    setFormState((previous) => {
      const next = { ...previous, [field]: value };
      if (field === "type") {
        next.categoryId = "";
      }
      return next;
    });
  }

  function openCreateModal() {
    setEditing(null);
    setFormProblem(null);
    setFormState(EMPTY_FORM);
    setMoreActionsOpen(false);
    setFormOpen(true);
  }

  function openEditModal(transaction: Transaction) {
    setEditing(transaction);
    setFormProblem(null);
    setFormState({
      type: transaction.type,
      accountId: transaction.account_id,
      categoryId: transaction.category_id,
      amountCents: String(transaction.amount_cents),
      date: transaction.date,
      merchant: transaction.merchant ?? "",
      note: transaction.note ?? ""
    });
    setFormOpen(true);
  }

  function buildCreatePayload(): TransactionCreate | null {
    const amount = Number(formState.amountCents);
    if (!Number.isInteger(amount) || amount <= 0) {
      setFormProblem(toLocalProblem({
        type: "about:blank",
        title: "Invalid amount",
        status: 400,
        detail: "amount_cents must be an integer greater than zero."
      }));
      return null;
    }
    if (!formState.accountId || !formState.categoryId || !formState.date) {
      setFormProblem(toLocalProblem({
        type: "about:blank",
        title: "Invalid request",
        status: 400,
        detail: "type, account, category, amount, and date are required."
      }));
      return null;
    }
    return {
      type: formState.type,
      account_id: formState.accountId,
      category_id: formState.categoryId,
      amount_cents: amount,
      date: formState.date,
      merchant: formState.merchant.trim() || undefined,
      note: formState.note.trim() || undefined
    };
  }

  function buildUpdatePayload(): TransactionUpdate | null {
    if (!editing) {
      return null;
    }
    const payload: TransactionUpdate = {};
    if (formState.type !== editing.type) {
      payload.type = formState.type;
    }
    if (formState.accountId !== editing.account_id) {
      payload.account_id = formState.accountId;
    }
    if (formState.categoryId !== editing.category_id) {
      payload.category_id = formState.categoryId;
    }
    if (formState.amountCents !== String(editing.amount_cents)) {
      const amount = Number(formState.amountCents);
      if (!Number.isInteger(amount) || amount <= 0) {
        setFormProblem(toLocalProblem({
          type: "about:blank",
          title: "Invalid amount",
          status: 400,
          detail: "amount_cents must be an integer greater than zero."
        }));
        return null;
      }
      payload.amount_cents = amount;
    }
    if (formState.date !== editing.date) {
      payload.date = formState.date;
    }
    const merchant = normalizeOptional(formState.merchant);
    if (merchant !== (editing.merchant ?? null)) {
      payload.merchant = merchant;
    }
    const note = normalizeOptional(formState.note);
    if (note !== (editing.note ?? null)) {
      payload.note = note;
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
    const payload = editing ? buildUpdatePayload() : buildCreatePayload();
    if (!payload) {
      return;
    }
    try {
      await saveMutation.mutateAsync(payload);
    } catch {
      // handled by mutation onError
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
      // handled by mutation onError
    }
  }

  async function handleRestore(transactionId: string) {
    setRestoringId(transactionId);
    setPageProblem(null);
    try {
      await restoreMutation.mutateAsync(transactionId);
    } catch {
      // handled by mutation onError
    } finally {
      setRestoringId(null);
    }
  }

  const rows = useMemo(
    () =>
      items.map((transaction) => (
        <tr key={transaction.id} className="border-t">
          <td className="px-3 py-2">{transaction.date}</td>
          <td className="px-3 py-2">{transaction.type}</td>
          <td className="px-3 py-2 text-right">{transaction.amount_cents}</td>
          <td className="px-3 py-2">{transaction.merchant ?? "-"}</td>
          <td className="px-3 py-2">{transaction.note ?? "-"}</td>
          <td className="px-3 py-2">{transaction.archived_at ? "Archived" : "Active"}</td>
          <td className="px-3 py-2 text-right">
            <TransactionRowActions
              transaction={transaction}
              restoringId={restoringId}
              onEdit={openEditModal}
              onArchive={setArchiveTarget}
              onRestore={(transactionId) => void handleRestore(transactionId)}
            />
          </td>
        </tr>
      )),
    [items, restoringId]
  );
  const mobileCards = useMemo(
    () =>
      items.map((transaction) => (
        <li key={transaction.id} className="surface-panel space-y-2 p-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-semibold">{transaction.merchant ?? "(no merchant)"}</p>
              <p className="text-xs text-muted-foreground">{transaction.date}</p>
            </div>
            <span className="rounded-full border border-border/80 bg-muted/60 px-2 py-1 text-[11px] font-semibold uppercase">
              {transaction.type}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Amount (cents)</p>
              <p className="font-semibold tabular-nums">{transaction.amount_cents}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">State</p>
              <p className="font-semibold">{transaction.archived_at ? "Archived" : "Active"}</p>
            </div>
          </div>
          {transaction.note ? <p className="text-xs text-muted-foreground">{transaction.note}</p> : null}
          <div className="flex justify-end">
            <TransactionRowActions
              transaction={transaction}
              restoringId={restoringId}
              onEdit={openEditModal}
              onArchive={setArchiveTarget}
              onRestore={(transactionId) => void handleRestore(transactionId)}
            />
          </div>
        </li>
      )),
    [items, restoringId]
  );

  const accountOptions = accountsQuery.data?.items ?? [];
  const categoryOptions = categoriesQuery.data?.items ?? [];

  return (
    <section className="space-y-4">
      <PageHeader
        title="Transactions"
        description="Create, update, restore, and archive transactions with contract-safe behavior."
        actions={(
          <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto sm:flex-nowrap">
            <Button type="button" size="sm" className="min-w-36" onClick={openCreateModal}>
              New transaction
            </Button>
            <div className="relative" ref={moreActionsRef}>
              <Button
                type="button"
                variant="outline"
                size="sm"
                aria-label="More options"
                onClick={() => setMoreActionsOpen((current) => !current)}
                className="h-9 w-9 px-0 text-lg leading-none text-muted-foreground"
              >
                ...
              </Button>
              {moreActionsOpen ? (
                <div className="absolute right-0 z-20 mt-2 w-52 rounded-md border bg-card p-2 shadow-lg">
                  <Button
                    type="button"
                    variant="outline"
                    className="mb-2 w-full justify-start"
                    onClick={() => {
                      setMoreActionsOpen(false);
                      navigate("/app/transactions/import");
                    }}
                  >
                    Import
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-start"
                    disabled={exportMutation.isPending || !isAuthenticated || isDateRangeInvalid}
                    onClick={() => exportMutation.mutate()}
                  >
                    {exportMutation.isPending ? "Exporting..." : "Export CSV"}
                  </Button>
                </div>
              ) : null}
            </div>
          </div>
        )}
      />

      <div className="surface-panel p-3 sm:p-4">
        <div className="grid grid-cols-1 gap-3 text-sm text-muted-foreground sm:grid-cols-2 xl:grid-cols-6">
          <label className="space-y-1">
            <span className="block">From</span>
            <input
              type="date"
              aria-label="From"
              className="field-input"
              value={filters.from}
              onChange={(event) =>
                setFilters((previous) => ({
                  ...previous,
                  from: event.target.value
                }))
              }
            />
          </label>
          <label className="space-y-1">
            <span className="block">To</span>
            <input
              type="date"
              aria-label="To"
              className="field-input"
              value={filters.to}
              onChange={(event) =>
                setFilters((previous) => ({
                  ...previous,
                  to: event.target.value
                }))
              }
            />
          </label>
          <label className="space-y-1">
            <span className="block">Type</span>
            <select
              className="field-select"
              value={filters.type}
              onChange={(event) =>
                setFilters((previous) => ({
                  ...previous,
                  type: event.target.value as TransactionType | "all"
                }))
              }
            >
              <option value="all">All</option>
              <option value="income">income</option>
              <option value="expense">expense</option>
            </select>
          </label>
          <label className="space-y-1">
            <span className="block">Account</span>
            <select
              className="field-select"
              value={filters.accountId}
              onChange={(event) =>
                setFilters((previous) => ({
                  ...previous,
                  accountId: event.target.value
                }))
              }
            >
              <option value="">All</option>
              {accountOptions.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1">
            <span className="block">Category</span>
            <select
              className="field-select"
              value={filters.categoryId}
              onChange={(event) =>
                setFilters((previous) => ({
                  ...previous,
                  categoryId: event.target.value
                }))
              }
            >
              <option value="">All</option>
              {categoryOptions.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1">
            <span className="block opacity-0">Options</span>
            <span className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-border/70 bg-background/90 px-3">
              <input
                type="checkbox"
                aria-label="Show archived"
                checked={filters.includeArchived}
                onChange={(event) =>
                  setFilters((previous) => ({
                    ...previous,
                    includeArchived: event.target.checked
                  }))
                }
              />
              Show archived
            </span>
          </label>
        </div>
        {isDateRangeInvalid ? (
          <p className="mt-2 text-sm text-destructive">From date must be on or before To date.</p>
        ) : null}
      </div>

      {pageProblem ? <ProblemDetailsInline error={pageProblem} onRetry={() => void transactionsQuery.refetch()} /> : null}

      <Card className="animate-rise-in">
        <CardContent className="p-0">
          {transactionsQuery.isLoading ? (
            <div className="p-4 text-sm text-muted-foreground">Loading transactions...</div>
          ) : items.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground">No transactions found.</div>
          ) : (
            <div className="space-y-3 p-3 sm:p-4">
              {!isDesktop ? <ul className="space-y-3">{mobileCards}</ul> : null}
              {isDesktop ? (
                <div className="overflow-x-auto">
                <table className="min-w-[760px] w-full text-sm">
                  <thead className="bg-muted/50 text-left">
                    <tr>
                      <th className="px-3 py-2">Date</th>
                      <th className="px-3 py-2">Type</th>
                      <th className="px-3 py-2 text-right">Amount cents</th>
                      <th className="px-3 py-2">Merchant</th>
                      <th className="px-3 py-2">Note</th>
                      <th className="px-3 py-2">State</th>
                      <th className="px-3 py-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>{rows}</tbody>
                </table>
                </div>
              ) : null}
            </div>
          )}
        </CardContent>
      </Card>

      {hasMore ? (
        <div className="mt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              if (nextCursor) {
                loadMoreMutation.mutate(nextCursor);
              }
            }}
            disabled={loadMoreMutation.isPending}
          >
            {loadMoreMutation.isPending ? "Loading..." : "Load more"}
          </Button>
        </div>
      ) : null}

      <TransactionForm
        open={formOpen}
        title={isEditing ? "Edit transaction" : "Create transaction"}
        submitLabel={isEditing ? "Save changes" : "Create transaction"}
        submitting={saveMutation.isPending}
        state={formState}
        accounts={accountOptions}
        categories={categoryOptions}
        problem={formProblem}
        onFieldChange={setField}
        onClose={() => setFormOpen(false)}
        onSubmit={handleSubmit}
        isEdit={isEditing}
      />

      <ConfirmDialog
        open={Boolean(archiveTarget)}
        title="Archive transaction?"
        description={archiveTarget ? `This will archive transaction from ${archiveTarget.date}.` : "This action archives the selected transaction."}
        confirmLabel="Archive"
        confirming={archiveMutation.isPending}
        onCancel={() => setArchiveTarget(null)}
        onConfirm={handleArchive}
      />
    </section>
  );
}
