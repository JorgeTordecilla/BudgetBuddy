import { FormEvent, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { listAccounts } from "@/api/accounts";
import { listCategories } from "@/api/categories";
import { mapTransactionProblem } from "@/api/problemMessages";
import { ApiProblemError } from "@/api/problem";
import {
  archiveTransaction,
  createTransaction,
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
import PageHeader from "@/components/PageHeader";
import ProblemBanner from "@/components/ProblemBanner";
import TransactionForm, { type TransactionFormState } from "@/components/transactions/TransactionForm";
import TransactionRowActions from "@/components/transactions/TransactionRowActions";
import { appendCursorPage } from "@/lib/pagination";
import { Button } from "@/ui/button";
import { Card, CardContent } from "@/ui/card";

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
  includeArchived: boolean;
};

const DEFAULT_FILTERS: TransactionFilters = {
  type: "all",
  accountId: "",
  categoryId: "",
  includeArchived: false
};

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
  const { apiClient } = useAuth();
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<TransactionFilters>(DEFAULT_FILTERS);
  const [items, setItems] = useState<Transaction[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [pageProblem, setPageProblem] = useState<ProblemDetails | null>(null);
  const [formProblem, setFormProblem] = useState<ProblemDetails | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<Transaction | null>(null);
  const [formState, setFormState] = useState<TransactionFormState>(EMPTY_FORM);

  const hasMore = Boolean(nextCursor);
  const isEditing = Boolean(editing);
  const queryKey = [
    "transactions",
    filters.type,
    filters.accountId,
    filters.categoryId,
    filters.includeArchived
  ] as const;

  function toProblemDetails(error: unknown, title: string): ProblemDetails {
    if (error instanceof ApiProblemError) {
      return mapTransactionProblem(error.problem, error.status, title);
    }
    return {
      type: "about:blank",
      title,
      status: 500,
      detail: "Unexpected client error."
    };
  }

  const accountsQuery = useQuery({
    queryKey: ["accounts-options"],
    queryFn: () =>
      listAccounts(apiClient, {
        includeArchived: false,
        limit: 100
      })
  });

  const categoriesQuery = useQuery({
    queryKey: ["categories-options"],
    queryFn: () =>
      listCategories(apiClient, {
        includeArchived: false,
        type: "all",
        limit: 100
      })
  });

  const transactionsQuery = useQuery({
    queryKey,
    queryFn: () =>
      listTransactions(apiClient, {
        includeArchived: filters.includeArchived,
        type: filters.type,
        accountId: filters.accountId || undefined,
        categoryId: filters.categoryId || undefined,
        limit: 20
      })
  });

  const loadMoreMutation = useMutation({
    mutationFn: (cursor: string) =>
      listTransactions(apiClient, {
        includeArchived: filters.includeArchived,
        type: filters.type,
        accountId: filters.accountId || undefined,
        categoryId: filters.categoryId || undefined,
        cursor,
        limit: 20
      }),
    onSuccess: (response) => {
      const merged = appendCursorPage({ items, nextCursor }, { items: response.items, nextCursor: response.next_cursor });
      setItems(dedupeById(merged.items));
      setNextCursor(response.next_cursor);
    },
    onError: (error) => {
      setPageProblem(toProblemDetails(error, "Failed to load transactions"));
    }
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: TransactionCreate | TransactionUpdate) => {
      if (editing) {
        await updateTransaction(apiClient, editing.id, payload);
        return;
      }
      await createTransaction(apiClient, payload as TransactionCreate);
    },
    onSuccess: async () => {
      setFormOpen(false);
      await queryClient.invalidateQueries({ queryKey: ["transactions"] });
      await queryClient.invalidateQueries({ queryKey: ["analytics"] });
    },
    onError: (error) => {
      setFormProblem(toProblemDetails(error, "Failed to save transaction"));
    }
  });

  const archiveMutation = useMutation({
    mutationFn: (transactionId: string) => archiveTransaction(apiClient, transactionId),
    onSuccess: async () => {
      setArchiveTarget(null);
      await queryClient.invalidateQueries({ queryKey: ["transactions"] });
      await queryClient.invalidateQueries({ queryKey: ["analytics"] });
    },
    onError: (error) => {
      setPageProblem(toProblemDetails(error, "Failed to archive transaction"));
    }
  });

  const restoreMutation = useMutation({
    mutationFn: (transactionId: string) => restoreTransaction(apiClient, transactionId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["transactions"] });
      await queryClient.invalidateQueries({ queryKey: ["analytics"] });
    },
    onError: (error) => {
      setPageProblem(toProblemDetails(error, "Failed to restore transaction"));
    }
  });

  useEffect(() => {
    if (transactionsQuery.data) {
      setItems(transactionsQuery.data.items);
      setNextCursor(transactionsQuery.data.next_cursor);
      setPageProblem(null);
    }
  }, [transactionsQuery.data]);

  useEffect(() => {
    if (transactionsQuery.error) {
      setPageProblem(toProblemDetails(transactionsQuery.error, "Failed to load transactions"));
    }
  }, [transactionsQuery.error]);

  useEffect(() => {
    setPageProblem(null);
  }, [filters]);

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
      setFormProblem({
        type: "about:blank",
        title: "Invalid amount",
        status: 400,
        detail: "amount_cents must be an integer greater than zero."
      });
      return null;
    }
    if (!formState.accountId || !formState.categoryId || !formState.date) {
      setFormProblem({
        type: "about:blank",
        title: "Invalid request",
        status: 400,
        detail: "type, account, category, amount, and date are required."
      });
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
        setFormProblem({
          type: "about:blank",
          title: "Invalid amount",
          status: 400,
          detail: "amount_cents must be an integer greater than zero."
        });
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

  const accountOptions = accountsQuery.data?.items ?? [];
  const categoryOptions = categoriesQuery.data?.items ?? [];

  return (
    <section>
      <PageHeader
        title="Transactions"
        description="Create, update, restore, and archive transactions with contract-safe behavior."
        actionLabel="New transaction"
        onAction={openCreateModal}
      >
        <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
          <label className="inline-flex items-center gap-2">
            <span>Type</span>
            <select
              className="rounded-md border bg-background px-2 py-1 text-sm"
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
          <label className="inline-flex items-center gap-2">
            <span>Account</span>
            <select
              className="rounded-md border bg-background px-2 py-1 text-sm"
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
          <label className="inline-flex items-center gap-2">
            <span>Category</span>
            <select
              className="rounded-md border bg-background px-2 py-1 text-sm"
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
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={filters.includeArchived}
              onChange={(event) =>
                setFilters((previous) => ({
                  ...previous,
                  includeArchived: event.target.checked
                }))
              }
            />
            Show archived
          </label>
        </div>
      </PageHeader>

      <ProblemBanner problem={pageProblem} onClose={() => setPageProblem(null)} />

      <Card>
        <CardContent className="p-0">
          {transactionsQuery.isLoading ? (
            <div className="p-4 text-sm text-muted-foreground">Loading transactions...</div>
          ) : items.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground">No transactions found.</div>
          ) : (
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
