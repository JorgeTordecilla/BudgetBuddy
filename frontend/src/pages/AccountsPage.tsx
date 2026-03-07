import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { archiveAccount, createAccount, listAccounts, updateAccount } from "@/api/accounts";
import type { Account, AccountCreate, AccountType } from "@/api/types";
import { useAuth } from "@/auth/useAuth";
import ConfirmDialog from "@/components/ConfirmDialog";
import ModalForm from "@/components/ModalForm";
import PageHeader from "@/components/PageHeader";
import SelectField from "@/components/SelectField";
import ProblemDetailsInline from "@/components/errors/ProblemDetailsInline";
import ProblemBanner from "@/components/ProblemBanner";
import { publishSuccessToast } from "@/components/feedback/successToastStore";
import { appendCursorPage } from "@/lib/pagination";
import { toLocalProblem } from "@/lib/problemDetails";
import { useIsDesktop } from "@/hooks/useIsDesktop";
import { Button } from "@/ui/button";
import { Card, CardContent } from "@/ui/card";
import { Input } from "@/ui/input";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/ui/table";
import { Textarea } from "@/ui/textarea";
import { centsToInputValue, formatCents } from "@/utils/money";

type AccountFormState = {
  name: string;
  type: AccountType;
  initialBalanceCents: string;
  note: string;
};

const EMPTY_FORM: AccountFormState = {
  name: "",
  type: "cash",
  initialBalanceCents: "",
  note: ""
};

function dedupeById(items: Account[]): Account[] {
  const map = new Map<string, Account>();
  items.forEach((item) => map.set(item.id, item));
  return [...map.values()];
}

export default function AccountsPage() {
  const { apiClient, user } = useAuth();
  const queryClient = useQueryClient();
  const [includeArchived, setIncludeArchived] = useState(false);
  const [items, setItems] = useState<Account[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [pageProblem, setPageProblem] = useState<unknown | null>(null);
  const [formProblem, setFormProblem] = useState<unknown | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<Account | null>(null);
  const [formState, setFormState] = useState<AccountFormState>(EMPTY_FORM);
  const isDesktop = useIsDesktop();
  const currencyCode = user?.currency_code ?? "USD";

  const hasMore = Boolean(nextCursor);
  const isEditing = Boolean(editing);

  const baseQueryKey = ["accounts", includeArchived] as const;

  const accountsQuery = useQuery({
    queryKey: baseQueryKey,
    meta: { skipGlobalErrorToast: true },
    queryFn: () =>
      listAccounts(apiClient, {
        includeArchived,
        limit: 20
      })
  });

  const loadMoreMutation = useMutation({
    meta: { skipGlobalErrorToast: true },
    mutationFn: (cursor: string) =>
      listAccounts(apiClient, {
        includeArchived,
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
    mutationFn: async (payload: AccountCreate) => {
      if (editing) {
        await updateAccount(apiClient, editing.id, payload);
        return;
      }
      await createAccount(apiClient, payload);
    },
    onSuccess: async () => {
      publishSuccessToast(editing ? "Account updated successfully." : "Account created successfully.");
      setFormOpen(false);
      await queryClient.invalidateQueries({ queryKey: ["accounts"] });
    },
    onError: (error) => {
      setFormProblem(error);
    }
  });

  const archiveMutation = useMutation({
    meta: { skipGlobalErrorToast: true },
    mutationFn: (accountId: string) => archiveAccount(apiClient, accountId),
    onSuccess: async () => {
      publishSuccessToast("Account archived successfully.");
      setArchiveTarget(null);
      await queryClient.invalidateQueries({ queryKey: ["accounts"] });
    },
    onError: (error) => {
      setPageProblem(error);
    }
  });

  useEffect(() => {
    if (accountsQuery.data) {
      setItems(accountsQuery.data.items);
      setNextCursor(accountsQuery.data.next_cursor);
      setPageProblem(null);
    }
  }, [accountsQuery.data]);

  useEffect(() => {
    if (accountsQuery.error) {
      setPageProblem(accountsQuery.error);
    }
  }, [accountsQuery.error]);

  useEffect(() => {
    setPageProblem(null);
  }, [includeArchived]);

  const openCreateModal = useCallback(() => {
    setEditing(null);
    setFormProblem(null);
    setFormState(EMPTY_FORM);
    setFormOpen(true);
  }, []);

  const openEditModal = useCallback((account: Account) => {
    setEditing(account);
    setFormProblem(null);
    setFormState({
      name: account.name,
      type: account.type,
      initialBalanceCents: centsToInputValue(currencyCode, account.initial_balance_cents),
      note: account.note ?? ""
    });
    setFormOpen(true);
  }, [currencyCode]);

  function parseFormPayload(): AccountCreate | null {
    const raw = formState.initialBalanceCents.trim();
    const normalized = raw.replace(/\s/g, "").replace(/,/g, "");
    const parsed = Number(normalized);
    const scaled = parsed * 100;
    if (!Number.isFinite(parsed) || Math.abs(scaled - Math.round(scaled)) > 1e-8) {
      setFormProblem(toLocalProblem({
        type: "about:blank",
        title: "Invalid amount",
        status: 400,
        detail: "Amount must be a valid money value with up to two decimals."
      }));
      return null;
    }
    return {
      name: formState.name.trim(),
      type: formState.type,
      initial_balance_cents: Math.round(scaled),
      note: formState.note.trim() ? formState.note.trim() : undefined
    };
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormProblem(null);
    const payload = parseFormPayload();
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

  const tableRows = useMemo(() => {
    return items.map((account) => (
      <tr key={account.id} className="border-t">
        <td className="px-3 py-2 font-medium">{account.name}</td>
        <td className="px-3 py-2">{account.type}</td>
        <td className="px-3 py-2 text-right">{formatCents(currencyCode, account.initial_balance_cents)}</td>
        <td className="px-3 py-2">{account.note ?? "-"}</td>
        <td className="px-3 py-2">{account.archived_at ? "Archived" : "Active"}</td>
        <td className="px-3 py-2 text-right">
          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => openEditModal(account)}>
              Edit
            </Button>
            {!account.archived_at ? (
              <Button type="button" size="sm" onClick={() => setArchiveTarget(account)}>
                Archive
              </Button>
            ) : null}
          </div>
        </td>
      </tr>
    ));
  }, [currencyCode, items, openEditModal]);
  const mobileCards = useMemo(
    () =>
      items.map((account) => (
        <li key={account.id}>
          <Card>
            <CardContent className="space-y-2 p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold">{account.name}</p>
                  <p className="text-xs text-muted-foreground uppercase">{account.type}</p>
                </div>
                <span className="rounded-full border border-border/70 bg-muted/60 px-2 py-1 text-[11px] font-semibold">
                  {account.archived_at ? "Archived" : "Active"}
                </span>
              </div>
              <p className="text-sm tabular-nums">Initial balance: {formatCents(currencyCode, account.initial_balance_cents)}</p>
              {account.note ? <p className="text-xs text-muted-foreground">{account.note}</p> : null}
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => openEditModal(account)}>
                  Edit
                </Button>
                {!account.archived_at ? (
                  <Button type="button" size="sm" onClick={() => setArchiveTarget(account)}>
                    Archive
                  </Button>
                ) : null}
              </div>
            </CardContent>
          </Card>
        </li>
      )),
    [currencyCode, items, openEditModal]
  );

  return (
    <section className="space-y-4">
      <PageHeader title="Accounts" description="Manage account setup for transaction tracking." actionLabel="New account" onAction={openCreateModal}>
        <label className="inline-flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={includeArchived}
            onChange={(event) => setIncludeArchived(event.target.checked)}
          />
          Show archived
        </label>
      </PageHeader>

      <ProblemBanner problem={pageProblem} onClose={() => setPageProblem(null)} />

      <Card className="animate-rise-in">
        <CardContent className="p-0">
          {accountsQuery.isLoading ? (
            <div className="p-4 text-sm text-muted-foreground">Loading accounts...</div>
          ) : items.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground">No accounts found.</div>
          ) : (
            <div className="space-y-3 p-3 sm:p-4">
              {!isDesktop ? <ul className="space-y-3">{mobileCards}</ul> : null}
              {isDesktop ? (
                <div className="overflow-x-auto">
                  <Table className="min-w-[680px]">
                    <TableHeader className="bg-muted/50 text-left">
                      <TableRow>
                        <TableHead className="px-3 py-2">Name</TableHead>
                        <TableHead className="px-3 py-2">Type</TableHead>
                        <TableHead className="px-3 py-2 text-right">Initial balance</TableHead>
                        <TableHead className="px-3 py-2">Note</TableHead>
                        <TableHead className="px-3 py-2">State</TableHead>
                        <TableHead className="px-3 py-2 text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>{tableRows}</TableBody>
                  </Table>
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

      <ModalForm
        open={formOpen}
        title={isEditing ? "Edit account" : "Create account"}
        description="Enter initial balance in major units (for example 10.50)."
        submitLabel={isEditing ? "Save changes" : "Create account"}
        submitting={saveMutation.isPending}
        onClose={() => setFormOpen(false)}
        onSubmit={handleSubmit}
      >
        <div className="grid gap-3 overflow-x-hidden">
          <label className="min-w-0 space-y-1 text-sm">
            <span>Name</span>
            <Input
              className="field-input"
              value={formState.name}
              onChange={(event) => setFormState((prev) => ({ ...prev, name: event.target.value }))}
              required
            />
          </label>
          <label className="min-w-0 space-y-1 text-sm">
            <span>Type</span>
            <SelectField
              ariaLabel="Type"
              value={formState.type}
              onChange={(value) => setFormState((prev) => ({ ...prev, type: value as AccountType }))}
              options={[
                { value: "cash", label: "cash" },
                { value: "debit", label: "debit" },
                { value: "credit", label: "credit" },
                { value: "bank", label: "bank" }
              ]}
            />
          </label>
          <label className="min-w-0 space-y-1 text-sm">
            <span>Initial balance</span>
            <Input
              className="field-input"
              value={formState.initialBalanceCents}
              onChange={(event) => setFormState((prev) => ({ ...prev, initialBalanceCents: event.target.value }))}
              required
            />
          </label>
          <label className="min-w-0 space-y-1 text-sm">
            <span>Note</span>
            <Textarea
              className="field-textarea"
              value={formState.note}
              onChange={(event) => setFormState((prev) => ({ ...prev, note: event.target.value }))}
              rows={3}
            />
          </label>
          {formProblem ? <ProblemDetailsInline error={formProblem} onDismiss={() => setFormProblem(null)} /> : null}
        </div>
      </ModalForm>

      <ConfirmDialog
        open={Boolean(archiveTarget)}
        title="Archive account?"
        description={archiveTarget ? `This will archive "${archiveTarget.name}".` : "This action archives the selected account."}
        confirmLabel="Archive"
        confirming={archiveMutation.isPending}
        onCancel={() => setArchiveTarget(null)}
        onConfirm={handleArchive}
      />
    </section>
  );
}
