import type { FormEvent } from "react";

import type { Account, Bill, Category } from "@/api/types";
import ModalForm from "@/components/ModalForm";
import ProblemDetailsInline from "@/components/errors/ProblemDetailsInline";
import SelectField from "@/components/SelectField";
import { Input } from "@/ui/input";

type BillFormState = {
  name: string;
  dueDay: string;
  budget: string;
  accountId: string;
  categoryId: string;
  note: string;
  isActive: boolean;
};

type BillFieldErrors = {
  name?: string;
  dueDay?: string;
  budget?: string;
  accountId?: string;
  categoryId?: string;
};

type Props = {
  open: boolean;
  submitting: boolean;
  editing: boolean;
  state: BillFormState;
  fieldErrors: BillFieldErrors;
  problem: unknown | null;
  accounts: Account[];
  categories: Category[];
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onFieldChange: (field: keyof BillFormState, value: string | boolean) => void;
  editingBill?: Bill | null;
};

export type { BillFormState, BillFieldErrors };

export default function BillForm({
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
  editingBill
}: Props) {
  const expenseCategories = categories.filter((category) => category.type === "expense");

  return (
    <ModalForm
      open={open}
      title={editing ? "Edit bill" : "Create recurring bill"}
      description="Recurring bills use due day 1-28 and integer cents for budget."
      submitLabel={editing ? "Save changes" : "Create bill"}
      submitting={submitting}
      onClose={onClose}
      onSubmit={onSubmit}
    >
      <div className="grid gap-3 overflow-x-hidden">
        <label className="space-y-1 text-sm">
          <span>Name</span>
          <Input
            value={state.name}
            onChange={(event) => onFieldChange("name", event.target.value)}
            aria-invalid={Boolean(fieldErrors.name)}
            className={fieldErrors.name ? "border-destructive focus-visible:ring-destructive/40" : undefined}
            placeholder="Electricity"
          />
          {fieldErrors.name ? <p className="text-xs text-destructive">{fieldErrors.name}</p> : null}
        </label>

        <label className="space-y-1 text-sm">
          <span>Due day (1-28)</span>
          <Input
            value={state.dueDay}
            onChange={(event) => onFieldChange("dueDay", event.target.value)}
            inputMode="numeric"
            aria-invalid={Boolean(fieldErrors.dueDay)}
            className={fieldErrors.dueDay ? "border-destructive focus-visible:ring-destructive/40" : undefined}
            placeholder="28"
          />
          {fieldErrors.dueDay ? <p className="text-xs text-destructive">{fieldErrors.dueDay}</p> : null}
        </label>

        <label className="space-y-1 text-sm">
          <span>Budget amount</span>
          <Input
            value={state.budget}
            onChange={(event) => onFieldChange("budget", event.target.value)}
            inputMode="numeric"
            aria-invalid={Boolean(fieldErrors.budget)}
            className={fieldErrors.budget ? "border-destructive focus-visible:ring-destructive/40" : undefined}
            placeholder="200000"
          />
          {fieldErrors.budget ? <p className="text-xs text-destructive">{fieldErrors.budget}</p> : null}
        </label>

        <label className="space-y-1 text-sm">
          <span>Account</span>
          <SelectField
            ariaLabel="Bill account"
            value={state.accountId}
            onChange={(value) => onFieldChange("accountId", value)}
            invalid={Boolean(fieldErrors.accountId)}
            options={[
              { value: "", label: "Select account" },
              ...accounts.map((account) => ({ value: account.id, label: account.name }))
            ]}
          />
          {fieldErrors.accountId ? <p className="text-xs text-destructive">{fieldErrors.accountId}</p> : null}
        </label>

        <label className="space-y-1 text-sm">
          <span>Category (expense only)</span>
          <SelectField
            ariaLabel="Bill category"
            value={state.categoryId}
            onChange={(value) => onFieldChange("categoryId", value)}
            invalid={Boolean(fieldErrors.categoryId)}
            options={[
              { value: "", label: "Select category" },
              ...expenseCategories.map((category) => ({ value: category.id, label: category.name }))
            ]}
          />
          {fieldErrors.categoryId ? <p className="text-xs text-destructive">{fieldErrors.categoryId}</p> : null}
        </label>

        <label className="space-y-1 text-sm">
          <span>Note</span>
          <Input
            value={state.note}
            onChange={(event) => onFieldChange("note", event.target.value)}
            placeholder="Optional"
          />
        </label>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={state.isActive}
            onChange={(event) => onFieldChange("isActive", event.target.checked)}
            className="h-4 w-4"
          />
          <span>{editingBill ? "Active in monthly status" : "Start as active"}</span>
        </label>

        {problem ? <ProblemDetailsInline error={problem} /> : null}
      </div>
    </ModalForm>
  );
}
