/* c8 ignore file */
import { FormEvent, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { listAccounts } from "@/api/accounts";
import { listCategories } from "@/api/categories";
import { getSavingsGoal, listSavingsGoals } from "@/api/savings";
import type { SavingsGoal, SavingsGoalStatus } from "@/api/types";
import { useAuth } from "@/auth/useAuth";
import ProblemDetailsInline from "@/components/errors/ProblemDetailsInline";
import { publishSuccessToast } from "@/components/feedback/successToastStore";
import PageHeader from "@/components/PageHeader";
import SavingsContributionModal from "@/components/savings/SavingsContributionModal";
import type { SavingsGoalFieldErrors, SavingsGoalFormState } from "@/components/savings/SavingsGoalForm";
import SavingsGoalForm from "@/components/savings/SavingsGoalForm";
import SavingsGoalDetail from "@/components/savings/SavingsGoalDetail";
import SavingsProgressBar from "@/components/savings/SavingsProgressBar";
import SavingsStatusBadge from "@/components/savings/SavingsStatusBadge";
import {
  savingsKeys,
  useArchiveSavingsGoal,
  useCancelSavingsGoal,
  useCompleteSavingsGoal,
  useCreateSavingsContribution,
  useCreateSavingsGoal,
  useDeleteSavingsContribution,
  useSavingsSummary,
  useUpdateSavingsGoal
} from "@/features/analytics/analyticsQueries";
import { Button } from "@/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/card";
import SelectField from "@/components/SelectField";
import { formatCents } from "@/utils/money";

const EMPTY_FORM: SavingsGoalFormState = {
  name: "",
  target: "",
  accountId: "",
  categoryId: "",
  deadline: "",
  note: ""
};

const statusFilterOptions: Array<{ value: SavingsGoalStatus | "all"; label: string }> = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" }
];

function normalizeGoalToForm(goal: SavingsGoal): SavingsGoalFormState {
  return {
    name: goal.name,
    target: String(goal.target_cents),
    accountId: goal.account_id,
    categoryId: goal.category_id,
    deadline: goal.deadline ?? "",
    note: goal.note ?? ""
  };
}

export default function SavingsPage() {
  const { apiClient, user } = useAuth();
  const queryClient = useQueryClient();
  const currencyCode = user?.currency_code ?? "USD";

  const [statusFilter, setStatusFilter] = useState<SavingsGoalStatus | "all">("all");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<SavingsGoal | null>(null);
  const [formState, setFormState] = useState<SavingsGoalFormState>(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState<SavingsGoalFieldErrors>({});
  const [formProblem, setFormProblem] = useState<unknown | null>(null);

  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);

  const [contributionGoal, setContributionGoal] = useState<SavingsGoal | null>(null);
  const [contributionAmount, setContributionAmount] = useState("");
  const [contributionNote, setContributionNote] = useState("");
  const [contributionProblem, setContributionProblem] = useState<unknown | null>(null);
  const [deletingContributionId, setDeletingContributionId] = useState<string | null>(null);

  const accountsQuery = useQuery({
    queryKey: ["accounts-options", "savings"],
    meta: { skipGlobalErrorToast: true },
    queryFn: () => listAccounts(apiClient, { includeArchived: false, limit: 100 })
  });

  const categoriesQuery = useQuery({
    queryKey: ["categories-options", "savings"],
    meta: { skipGlobalErrorToast: true },
    queryFn: () => listCategories(apiClient, { includeArchived: false, type: "expense", limit: 100 })
  });

  const goalsQuery = useQuery({
    queryKey: savingsKeys.list(statusFilter),
    meta: { skipGlobalErrorToast: true },
    queryFn: () => listSavingsGoals(apiClient, statusFilter === "all" ? { status: "all" } : { status: statusFilter })
  });

  const summaryQuery = useSavingsSummary(apiClient, true);

  const goalDetailQuery = useQuery({
    queryKey: ["savings-goals", "detail", selectedGoalId],
    enabled: Boolean(selectedGoalId),
    meta: { skipGlobalErrorToast: true },
    queryFn: () => getSavingsGoal(apiClient, selectedGoalId as string)
  });

  const createGoalMutation = useCreateSavingsGoal(apiClient);
  const updateGoalMutation = useUpdateSavingsGoal(apiClient);
  const archiveGoalMutation = useArchiveSavingsGoal(apiClient);
  const completeGoalMutation = useCompleteSavingsGoal(apiClient);
  const cancelGoalMutation = useCancelSavingsGoal(apiClient);
  const createContributionMutation = useCreateSavingsContribution(apiClient);
  const deleteContributionMutation = useDeleteSavingsContribution(apiClient);

  const goals = goalsQuery.data?.items ?? [];

  function setFormField(field: keyof SavingsGoalFormState, value: string) {
    setFormState((previous) => ({ ...previous, [field]: value }));
  }

  function openCreateForm() {
    setEditingGoal(null);
    setFormState(EMPTY_FORM);
    setFieldErrors({});
    setFormProblem(null);
    setIsFormOpen(true);
  }

  function openEditForm(goal: SavingsGoal) {
    setEditingGoal(goal);
    setFormState(normalizeGoalToForm(goal));
    setFieldErrors({});
    setFormProblem(null);
    setIsFormOpen(true);
  }

  function closeForm() {
    if (createGoalMutation.isPending || updateGoalMutation.isPending) {
      return;
    }
    setIsFormOpen(false);
  }

  function validateForm(): { valid: boolean; target: number } {
    const nextErrors: SavingsGoalFieldErrors = {};

    if (!formState.name.trim()) {
      nextErrors.name = "Name is required.";
    }

    const target = Number(formState.target);
    if (!Number.isInteger(target) || target <= 0) {
      nextErrors.target = "Target must be an integer amount in cents (> 0).";
    }

    if (!formState.accountId) {
      nextErrors.accountId = "Account is required.";
    }

    if (!formState.categoryId) {
      nextErrors.categoryId = "Expense category is required.";
    }

    if (formState.deadline) {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const deadlineDate = new Date(`${formState.deadline}T00:00:00`);
      if (deadlineDate < today) {
        nextErrors.deadline = "Deadline cannot be in the past.";
      }
    }

    setFieldErrors(nextErrors);
    return { valid: Object.keys(nextErrors).length === 0, target };
  }

  async function submitGoalForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormProblem(null);
    const validation = validateForm();
    if (!validation.valid) {
      return;
    }

    const payload = {
      name: formState.name.trim(),
      target_cents: validation.target,
      account_id: formState.accountId,
      category_id: formState.categoryId,
      deadline: formState.deadline || null,
      note: formState.note.trim() || null
    };

    try {
      if (editingGoal) {
        await updateGoalMutation.mutateAsync({ goalId: editingGoal.id, payload });
        publishSuccessToast("Savings goal updated successfully.");
      } else {
        await createGoalMutation.mutateAsync(payload);
        publishSuccessToast("Savings goal created successfully.");
      }
      setIsFormOpen(false);
      await queryClient.invalidateQueries({ queryKey: savingsKeys.all });
    } catch (error) {
      setFormProblem(error);
    }
  }

  async function archiveGoal(goalId: string) {
    try {
      await archiveGoalMutation.mutateAsync(goalId);
      if (selectedGoalId === goalId) {
        setSelectedGoalId(null);
      }
      publishSuccessToast("Savings goal archived successfully.");
    } catch (error) {
      setFormProblem(error);
    }
  }

  async function completeGoal(goalId: string) {
    try {
      await completeGoalMutation.mutateAsync(goalId);
      publishSuccessToast("Savings goal marked as completed.");
    } catch (error) {
      setFormProblem(error);
    }
  }

  async function cancelGoal(goalId: string) {
    try {
      await cancelGoalMutation.mutateAsync(goalId);
      publishSuccessToast("Savings goal cancelled.");
    } catch (error) {
      setFormProblem(error);
    }
  }

  function openContributionModal(goal: SavingsGoal) {
    setContributionGoal(goal);
    setContributionAmount("");
    setContributionNote("");
    setContributionProblem(null);
  }

  function closeContributionModal() {
    if (createContributionMutation.isPending) {
      return;
    }
    setContributionGoal(null);
    setContributionAmount("");
    setContributionNote("");
    setContributionProblem(null);
  }

  async function submitContribution(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!contributionGoal) {
      return;
    }

    const amount = Number(contributionAmount);
    if (!Number.isInteger(amount) || amount <= 0) {
      setContributionProblem(new Error("Invalid contribution amount"));
      return;
    }

    try {
      await createContributionMutation.mutateAsync({
        goalId: contributionGoal.id,
        payload: {
          amount_cents: amount,
          note: contributionNote.trim() || null
        }
      });
      publishSuccessToast("Contribution added successfully.");
      closeContributionModal();
      if (selectedGoalId === contributionGoal.id) {
        await queryClient.invalidateQueries({ queryKey: ["savings-goals", "detail", selectedGoalId] });
      }
    } catch (error) {
      setContributionProblem(error);
    }
  }

  async function deleteContribution(contributionId: string) {
    if (!selectedGoalId) {
      return;
    }

    setDeletingContributionId(contributionId);
    try {
      await deleteContributionMutation.mutateAsync({ goalId: selectedGoalId, contributionId });
      publishSuccessToast("Contribution deleted.");
      await queryClient.invalidateQueries({ queryKey: ["savings-goals", "detail", selectedGoalId] });
    } catch (error) {
      setFormProblem(error);
    } finally {
      setDeletingContributionId(null);
    }
  }

  return (
    <section data-testid="savings-page" className="relative mx-auto w-full max-w-6xl space-y-4 overflow-x-hidden pb-3 sm:space-y-5">
      <PageHeader
        title="Savings Goals"
        description="Track targets, progress, and contributions in one place."
        actionLabel="Add Goal"
        onAction={openCreateForm}
      />

      <div className="grid gap-3 md:grid-cols-4">
        <Card className="border-border/70 bg-card/95 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Active goals</CardTitle>
          </CardHeader>
          <CardContent className="text-xl font-semibold">{summaryQuery.data?.active_count ?? 0}</CardContent>
        </Card>
        <Card className="border-border/70 bg-card/95 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total saved</CardTitle>
          </CardHeader>
          <CardContent className="text-xl font-semibold">{formatCents(currencyCode, summaryQuery.data?.total_saved_cents ?? 0)}</CardContent>
        </Card>
        <Card className="border-border/70 bg-card/95 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total remaining</CardTitle>
          </CardHeader>
          <CardContent className="text-xl font-semibold">{formatCents(currencyCode, summaryQuery.data?.total_remaining_cents ?? 0)}</CardContent>
        </Card>
        <Card className="border-border/70 bg-card/95 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Overall progress</CardTitle>
          </CardHeader>
          <CardContent className="text-xl font-semibold">{(summaryQuery.data?.overall_progress_pct ?? 0).toFixed(1)}%</CardContent>
        </Card>
      </div>

      <Card className="border-border/70 bg-card/95 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Filter</CardTitle>
        </CardHeader>
        <CardContent>
          <SelectField
            ariaLabel="Savings status filter"
            value={statusFilter}
            onChange={(value) => setStatusFilter(value as SavingsGoalStatus | "all")}
            options={statusFilterOptions.map((option) => ({ value: option.value, label: option.label }))}
          />
        </CardContent>
      </Card>

      {goals.length === 0 ? (
        <Card className="border-border/70 bg-card/95 shadow-sm">
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            <p>No savings goals yet - set your first goal.</p>
            <Button type="button" className="mt-4" onClick={openCreateForm}>Create goal</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {goals.map((goal) => (
            <Card key={goal.id} className="overflow-hidden border-border/70 bg-card/95 shadow-sm">
              <CardHeader className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <button
                    type="button"
                    className="text-left text-base font-semibold hover:underline"
                    onClick={() => setSelectedGoalId(goal.id)}
                  >
                    {goal.name}
                  </button>
                  <SavingsStatusBadge status={goal.status} deadline={goal.deadline} />
                </div>
                <SavingsProgressBar progressPct={goal.progress_pct} />
              </CardHeader>
              <CardContent className="grid gap-3 text-sm">
                <p>
                  <strong>Saved:</strong> {formatCents(currencyCode, goal.saved_cents)} / {formatCents(currencyCode, goal.target_cents)}
                </p>
                <p>
                  <strong>Remaining:</strong> {formatCents(currencyCode, goal.remaining_cents)}
                </p>
                {goal.deadline ? <p><strong>Deadline:</strong> {goal.deadline}</p> : null}
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => openEditForm(goal)}>Edit</Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => archiveGoal(goal.id)}>Archive</Button>
                  {goal.status === "active" ? (
                    <>
                      <Button type="button" size="sm" onClick={() => openContributionModal(goal)}>Add contribution</Button>
                      <Button type="button" variant="outline" size="sm" onClick={() => completeGoal(goal.id)}>Mark complete</Button>
                      <Button type="button" variant="outline" size="sm" onClick={() => cancelGoal(goal.id)}>Cancel</Button>
                    </>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {selectedGoalId && goalDetailQuery.data ? (
        <SavingsGoalDetail
          goal={goalDetailQuery.data}
          currencyCode={currencyCode}
          onDeleteContribution={deleteContribution}
          deletingContributionId={deletingContributionId}
        />
      ) : null}

      {goalsQuery.error ? <ProblemDetailsInline error={goalsQuery.error} /> : null}
      {summaryQuery.error ? <ProblemDetailsInline error={summaryQuery.error} /> : null}
      {formProblem ? <ProblemDetailsInline error={formProblem} onDismiss={() => setFormProblem(null)} /> : null}

      <SavingsGoalForm
        open={isFormOpen}
        submitting={createGoalMutation.isPending || updateGoalMutation.isPending}
        editing={Boolean(editingGoal)}
        state={formState}
        fieldErrors={fieldErrors}
        problem={formProblem}
        accounts={accountsQuery.data?.items ?? []}
        categories={categoriesQuery.data?.items ?? []}
        editingGoal={editingGoal}
        onClose={closeForm}
        onSubmit={submitGoalForm}
        onFieldChange={setFormField}
      />

      <SavingsContributionModal
        open={Boolean(contributionGoal)}
        goalName={contributionGoal?.name ?? ""}
        amount={contributionAmount}
        note={contributionNote}
        submitting={createContributionMutation.isPending}
        problem={contributionProblem}
        onClose={closeContributionModal}
        onAmountChange={setContributionAmount}
        onNoteChange={setContributionNote}
        onSubmit={submitContribution}
      />
    </section>
  );
}
