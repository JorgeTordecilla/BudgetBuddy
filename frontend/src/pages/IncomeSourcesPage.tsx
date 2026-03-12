import { FormEvent, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  archiveIncomeSource,
  createIncomeSource,
  listIncomeSources,
  restoreIncomeSource,
  updateIncomeSource
} from "@/api/incomeSources";
import type { IncomeSource, IncomeSourceCreate } from "@/api/types";
import { useAuth } from "@/auth/useAuth";
import ConfirmDialog from "@/components/ConfirmDialog";
import ModalForm from "@/components/ModalForm";
import PageHeader from "@/components/PageHeader";
import ProblemBanner from "@/components/ProblemBanner";
import ProblemDetailsInline from "@/components/errors/ProblemDetailsInline";
import { publishSuccessToast } from "@/components/feedback/successToastStore";
import { useIsDesktop } from "@/hooks/useIsDesktop";
import { Button } from "@/ui/button";
import { Card, CardContent } from "@/ui/card";
import { Input } from "@/ui/input";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/ui/table";
import { Textarea } from "@/ui/textarea";
import { centsToInputValue, formatCents, parseMoneyInputToCents, resolveMinorUnits } from "@/utils/money";

type IncomeSourceFormState = {
  name: string;
  expectedAmount: string;
  isActive: boolean;
  note: string;
};

const EMPTY_FORM: IncomeSourceFormState = {
  name: "",
  expectedAmount: "",
  isActive: true,
  note: ""
};

export default function IncomeSourcesPage() {
  const { apiClient, user } = useAuth();
  const queryClient = useQueryClient();
  const isDesktop = useIsDesktop();

  const [includeArchived, setIncludeArchived] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<IncomeSource | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<IncomeSource | null>(null);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [formState, setFormState] = useState<IncomeSourceFormState>(EMPTY_FORM);
  const [pageProblem, setPageProblem] = useState<unknown | null>(null);
  const [formProblem, setFormProblem] = useState<unknown | null>(null);
  const currencyCode = user?.currency_code ?? "USD";
  const amountExample = centsToInputValue(currencyCode, 4_000_000 * (10 ** resolveMinorUnits(currencyCode)));
  const amountPlaceholder = centsToInputValue(currencyCode, 0);

  const query = useQuery({
    queryKey: ["income-sources", includeArchived] as const,
    meta: { skipGlobalErrorToast: true },
    queryFn: () => listIncomeSources(apiClient, { includeArchived })
  });

  const saveMutation = useMutation({
    meta: { skipGlobalErrorToast: true },
    mutationFn: async (payload: IncomeSourceCreate) => {
      if (editing) {
        await updateIncomeSource(apiClient, editing.id, {
          name: payload.name,
          expected_amount_cents: payload.expected_amount_cents,
          is_active: payload.is_active,
          note: payload.note ?? null
        });
        return;
      }
      await createIncomeSource(apiClient, payload);
    },
    onSuccess: async () => {
      publishSuccessToast(editing ? "Income source updated successfully." : "Income source created successfully.");
      setFormOpen(false);
      await queryClient.invalidateQueries({ queryKey: ["income-sources"] });
      await queryClient.invalidateQueries({ queryKey: ["analytics"] });
    },
    onError: (error) => {
      setFormProblem(error);
    }
  });

  const archiveMutation = useMutation({
    meta: { skipGlobalErrorToast: true },
    mutationFn: (incomeSourceId: string) => archiveIncomeSource(apiClient, incomeSourceId),
    onSuccess: async () => {
      publishSuccessToast("Income source archived successfully.");
      setArchiveTarget(null);
      await queryClient.invalidateQueries({ queryKey: ["income-sources"] });
      await queryClient.invalidateQueries({ queryKey: ["analytics"] });
    },
    onError: (error) => {
      setPageProblem(error);
    }
  });

  const restoreMutation = useMutation({
    meta: { skipGlobalErrorToast: true },
    mutationFn: (incomeSourceId: string) => restoreIncomeSource(apiClient, incomeSourceId),
    onSuccess: async () => {
      publishSuccessToast("Income source restored successfully.");
      await queryClient.invalidateQueries({ queryKey: ["income-sources"] });
      await queryClient.invalidateQueries({ queryKey: ["analytics"] });
    },
    onError: (error) => {
      setPageProblem(error);
    }
  });

  function openCreateModal() {
    setEditing(null);
    setFormProblem(null);
    setFormState(EMPTY_FORM);
    setFormOpen(true);
  }

  function openEditModal(item: IncomeSource) {
    setEditing(item);
    setFormProblem(null);
    setFormState({
      name: item.name,
      expectedAmount: centsToInputValue(currencyCode, item.expected_amount_cents),
      isActive: item.is_active,
      note: item.note ?? ""
    });
    setFormOpen(true);
  }

  function parseFormPayload(): IncomeSourceCreate | null {
    const amount = parseMoneyInputToCents(currencyCode, formState.expectedAmount);
    if (!amount) {
      setFormProblem({
        type: "about:blank",
        title: "Invalid amount",
        status: 400,
        detail: "Expected amount must be a positive money value for the selected currency."
      });
      return null;
    }
    return {
      name: formState.name.trim(),
      expected_amount_cents: amount,
      frequency: "monthly",
      is_active: formState.isActive,
      note: formState.note.trim() || undefined
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
      // handled by mutation
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
      // handled by mutation
    }
  }

  async function handleRestore(incomeSourceId: string) {
    setRestoringId(incomeSourceId);
    setPageProblem(null);
    try {
      await restoreMutation.mutateAsync(incomeSourceId);
    } catch {
      // handled by mutation
    } finally {
      setRestoringId(null);
    }
  }

  const items = query.data?.items ?? [];

  const tableRows = useMemo(
    () =>
      items.map((item) => (
        <tr key={item.id} className="border-t">
          <td className="px-3 py-2 font-medium">{item.name}</td>
          <td className="px-3 py-2 text-right">{formatCents(currencyCode, item.expected_amount_cents)}</td>
          <td className="px-3 py-2">{item.frequency}</td>
          <td className="px-3 py-2">{item.is_active ? "Active" : "Inactive"}</td>
          <td className="px-3 py-2">{item.archived_at ? "Archived" : "Available"}</td>
          <td className="px-3 py-2 text-right">
            <div className="flex flex-wrap justify-end gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => openEditModal(item)}>
                Edit
              </Button>
              {item.archived_at ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={restoringId === item.id}
                  onClick={() => void handleRestore(item.id)}
                >
                  {restoringId === item.id ? "Restoring..." : "Restore"}
                </Button>
              ) : (
                <Button type="button" size="sm" onClick={() => setArchiveTarget(item)}>
                  Archive
                </Button>
              )}
            </div>
          </td>
        </tr>
      )),
    [currencyCode, items, restoringId]
  );

  const mobileCards = useMemo(
    () =>
      items.map((item) => (
        <li key={item.id}>
          <Card>
            <CardContent className="space-y-2 p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold">{item.name}</p>
                  <p className="text-xs uppercase text-muted-foreground">{item.frequency}</p>
                </div>
                <span className="rounded-full border border-border/70 bg-muted/60 px-2 py-1 text-[11px] font-semibold">
                  {item.archived_at ? "Archived" : item.is_active ? "Active" : "Inactive"}
                </span>
              </div>
              <p className="text-sm tabular-nums">Expected amount: {formatCents(currencyCode, item.expected_amount_cents)}</p>
              {item.note ? <p className="text-xs text-muted-foreground">{item.note}</p> : null}
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => openEditModal(item)}>
                  Edit
                </Button>
                {item.archived_at ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={restoringId === item.id}
                    onClick={() => void handleRestore(item.id)}
                  >
                    {restoringId === item.id ? "Restoring..." : "Restore"}
                  </Button>
                ) : (
                  <Button type="button" size="sm" onClick={() => setArchiveTarget(item)}>
                    Archive
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </li>
      )),
    [currencyCode, items, restoringId]
  );

  return (
    <section className="space-y-4">
      <PageHeader
        title="Income Sources"
        description="Track expected monthly income sources and compare against actual inflows."
        actionLabel="New income source"
        onAction={openCreateModal}
      >
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
          {query.isLoading ? (
            <div className="p-4 text-sm text-muted-foreground">Loading income sources...</div>
          ) : items.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground">No income sources found.</div>
          ) : (
            <div className="space-y-3 p-3 sm:p-4">
              {!isDesktop ? <ul className="space-y-3">{mobileCards}</ul> : null}
              {isDesktop ? (
                <div className="overflow-x-auto">
                  <Table className="min-w-[760px]">
                    <TableHeader className="bg-muted/50 text-left">
                      <TableRow>
                        <TableHead className="px-3 py-2">Name</TableHead>
                        <TableHead className="px-3 py-2 text-right">Expected amount</TableHead>
                        <TableHead className="px-3 py-2">Frequency</TableHead>
                        <TableHead className="px-3 py-2">Status</TableHead>
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

      <ModalForm
        open={formOpen}
        title={editing ? "Edit income source" : "Create income source"}
        description={`Enter expected amount in ${currencyCode} major units (for example ${amountExample}).`}
        submitLabel={editing ? "Save changes" : "Create income source"}
        submitting={saveMutation.isPending}
        onClose={() => setFormOpen(false)}
        onSubmit={handleSubmit}
      >
        <div className="grid gap-3 overflow-x-hidden">
          <label className="min-w-0 space-y-1 text-sm">
            <span>Name</span>
            <Input value={formState.name} onChange={(event) => setFormState((prev) => ({ ...prev, name: event.target.value }))} required />
          </label>
          <label className="min-w-0 space-y-1 text-sm">
            <span>Expected amount</span>
            <Input
              value={formState.expectedAmount}
              onChange={(event) => setFormState((prev) => ({ ...prev, expectedAmount: event.target.value }))}
              placeholder={amountPlaceholder}
              required
            />
          </label>
          <label className="inline-flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={formState.isActive}
              onChange={(event) => setFormState((prev) => ({ ...prev, isActive: event.target.checked }))}
            />
            Active source
          </label>
          <label className="min-w-0 space-y-1 text-sm">
            <span>Note</span>
            <Textarea value={formState.note} onChange={(event) => setFormState((prev) => ({ ...prev, note: event.target.value }))} />
          </label>
          {formProblem ? <ProblemDetailsInline error={formProblem} /> : null}
        </div>
      </ModalForm>

      <ConfirmDialog
        open={Boolean(archiveTarget)}
        title="Archive income source?"
        description={archiveTarget ? `This will archive ${archiveTarget.name}.` : "This action archives the selected income source."}
        confirmLabel="Archive"
        confirming={archiveMutation.isPending}
        onCancel={() => setArchiveTarget(null)}
        onConfirm={handleArchive}
      />
    </section>
  );
}
