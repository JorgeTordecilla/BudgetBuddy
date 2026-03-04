/* c8 ignore file */
import type { FormEvent } from "react";

import type { Account, Category, SavingsGoal } from "@/api/types";
import ModalForm from "@/components/ModalForm";
import ProblemDetailsInline from "@/components/errors/ProblemDetailsInline";
import SelectField from "@/components/SelectField";
import { Input } from "@/ui/input";

export type SavingsGoalFormState = {
  name: string;
  target: string;
  accountId: string;
  categoryId: string;
  deadline: string;
  note: string;
};

export type SavingsGoalFieldErrors = {
  name?: string;
  target?: string;
  accountId?: string;
  categoryId?: string;
  deadline?: string;
};

type Props = {
  open: boolean;
  submitting: boolean;
  editing: boolean;
  state: SavingsGoalFormState;
  fieldErrors: SavingsGoalFieldErrors;
  problem: unknown | null;
  accounts: Account[];
  categories: Category[];
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onFieldChange: (field: keyof SavingsGoalFormState, value: string) => void;
  editingGoal?: SavingsGoal | null;
};

export default function SavingsGoalForm({
  open,
  submitting,
  editing,
  state,
  fieldErrors,
  problem,
  accounts,
  categories,
  onClose,
  onSubmit,
  onFieldChange,
  editingGoal
}: Props) {
  const expenseCategories = categories.filter((category) => category.type === "expense");

  return (
    <ModalForm
      open={open}
      title={editing ? "Edit savings goal" : "Create savings goal"}
      description="Set a target and track progress with real contributions."
      submitLabel={editing ? "Save changes" : "Create goal"}
      submitting={submitting}
      onClose={onClose}
      onSubmit={onSubmit}
    >
      <div className="grid gap-3 overflow-x-hidden">
        <label className="space-y-1 text-sm">
          <span>Name</span>
          <Input value={state.name} onChange={(event) => onFieldChange("name", event.target.value)} placeholder="Emergency Fund" />
          {fieldErrors.name ? <p className="text-xs text-destructive">{fieldErrors.name}</p> : null}
        </label>

        <label className="space-y-1 text-sm">
          <span>Target amount (cents)</span>
          <Input value={state.target} onChange={(event) => onFieldChange("target", event.target.value)} inputMode="numeric" placeholder="500000" />
          {fieldErrors.target ? <p className="text-xs text-destructive">{fieldErrors.target}</p> : null}
        </label>

        <label className="space-y-1 text-sm">
          <span>Account</span>
          <SelectField
            ariaLabel="Savings goal account"
            value={state.accountId}
            onChange={(value) => onFieldChange("accountId", value)}
            invalid={Boolean(fieldErrors.accountId)}
            options={[{ value: "", label: "Select account" }, ...accounts.map((item) => ({ value: item.id, label: item.name }))]}
          />
          {fieldErrors.accountId ? <p className="text-xs text-destructive">{fieldErrors.accountId}</p> : null}
        </label>

        <label className="space-y-1 text-sm">
          <span>Category (expense only)</span>
          <SelectField
            ariaLabel="Savings goal category"
            value={state.categoryId}
            onChange={(value) => onFieldChange("categoryId", value)}
            invalid={Boolean(fieldErrors.categoryId)}
            options={[{ value: "", label: "Select category" }, ...expenseCategories.map((item) => ({ value: item.id, label: item.name }))]}
          />
          {fieldErrors.categoryId ? <p className="text-xs text-destructive">{fieldErrors.categoryId}</p> : null}
        </label>

        <label className="space-y-1 text-sm">
          <span>Deadline (optional)</span>
          <Input type="date" value={state.deadline} onChange={(event) => onFieldChange("deadline", event.target.value)} />
          {fieldErrors.deadline ? <p className="text-xs text-destructive">{fieldErrors.deadline}</p> : null}
        </label>

        <label className="space-y-1 text-sm">
          <span>Note</span>
          <Input value={state.note} onChange={(event) => onFieldChange("note", event.target.value)} placeholder="Optional" />
        </label>

        {editingGoal ? <p className="text-xs text-muted-foreground">Status: {editingGoal.status}</p> : null}
        {problem ? <ProblemDetailsInline error={problem} /> : null}
      </div>
    </ModalForm>
  );
}
