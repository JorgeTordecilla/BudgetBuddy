import type { FormEvent } from "react";

import type { Category, ProblemDetails } from "@/api/types";
import ModalForm from "@/components/ModalForm";
import ProblemBanner from "@/components/ProblemBanner";

export type BudgetFormState = {
  month: string;
  categoryId: string;
  limit: string;
};

type BudgetFieldErrors = {
  month?: string;
  limit?: string;
};

type Props = {
  open: boolean;
  editing: boolean;
  submitting: boolean;
  state: BudgetFormState;
  categories: Category[];
  problem: ProblemDetails | null;
  fieldErrors: BudgetFieldErrors;
  onDismissProblem: () => void;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onFieldChange: (field: keyof BudgetFormState, value: string) => void;
};

function getCategoryLabel(category: Category): string {
  return `${category.name} (${category.type})`;
}

export default function BudgetFormModal({
  open,
  editing,
  submitting,
  state,
  categories,
  problem,
  fieldErrors,
  onDismissProblem,
  onClose,
  onSubmit,
  onFieldChange
}: Props) {
  return (
    <ModalForm
      open={open}
      title={editing ? "Edit budget" : "Create budget"}
      description="Budget limits are sent as integer cents."
      submitLabel={editing ? "Save changes" : "Create budget"}
      submitting={submitting}
      onClose={onClose}
      onSubmit={onSubmit}
    >
      <div className="grid gap-3">
        <label className="space-y-1 text-sm">
          <span>Month</span>
          <input
            type="month"
            className={`w-full rounded-md border px-3 py-2 ${fieldErrors.month ? "border-destructive" : ""}`}
            value={state.month}
            onChange={(event) => onFieldChange("month", event.target.value)}
            aria-invalid={Boolean(fieldErrors.month)}
          />
          {fieldErrors.month ? <p className="text-xs text-destructive">{fieldErrors.month}</p> : null}
        </label>
        <label className="space-y-1 text-sm">
          <span>Category</span>
          <select
            className="w-full rounded-md border px-3 py-2"
            value={state.categoryId}
            onChange={(event) => onFieldChange("categoryId", event.target.value)}
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
            className={`w-full rounded-md border px-3 py-2 ${fieldErrors.limit ? "border-destructive" : ""}`}
            value={state.limit}
            onChange={(event) => onFieldChange("limit", event.target.value)}
            placeholder="0.00"
            inputMode="decimal"
            aria-invalid={Boolean(fieldErrors.limit)}
          />
          {fieldErrors.limit ? <p className="text-xs text-destructive">{fieldErrors.limit}</p> : null}
        </label>
        <ProblemBanner problem={problem} onClose={onDismissProblem} />
      </div>
    </ModalForm>
  );
}
