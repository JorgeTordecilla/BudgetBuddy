import type { FormEvent } from "react";

import type { Category } from "@/api/types";
import DatePickerField from "@/components/DatePickerField";
import ModalForm from "@/components/ModalForm";
import ProblemDetailsInline from "@/components/errors/ProblemDetailsInline";
import SelectField from "@/components/SelectField";
import { Input } from "@/ui/input";
import { centsToInputValue } from "@/utils/money";

export type BudgetFormState = {
  month: string;
  categoryId: string;
  limit: string;
};

type BudgetFieldErrors = {
  month?: string;
  categoryId?: string;
  limit?: string;
};

type Props = {
  open: boolean;
  editing: boolean;
  submitting: boolean;
  state: BudgetFormState;
  categories: Category[];
  problem: unknown | null;
  fieldErrors: BudgetFieldErrors;
  currencyCode: string;
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
  currencyCode,
  onClose,
  onSubmit,
  onFieldChange
}: Props) {
  const amountPlaceholder = centsToInputValue(currencyCode, 0);

  return (
    <ModalForm
      open={open}
      title={editing ? "Edit budget" : "Create budget"}
      description={`Enter limit in ${currencyCode} major units.`}
      submitLabel={editing ? "Save changes" : "Create budget"}
      submitting={submitting}
      onClose={onClose}
      onSubmit={onSubmit}
    >
      <div className="grid gap-3 overflow-x-hidden">
        <label className="min-w-0 w-full space-y-1 text-sm">
          <span>Month</span>
          <DatePickerField
            mode="month"
            ariaLabel="Month"
            value={state.month}
            onChange={(value) => onFieldChange("month", value)}
            invalid={Boolean(fieldErrors.month)}
          />
          {fieldErrors.month ? <p className="text-xs text-destructive">{fieldErrors.month}</p> : null}
        </label>
        <label className="min-w-0 space-y-1 text-sm">
          <span>Category</span>
          <SelectField
            ariaLabel="Category"
            value={state.categoryId}
            onChange={(value) => onFieldChange("categoryId", value)}
            invalid={Boolean(fieldErrors.categoryId)}
            options={[
              { value: "", label: "Select category" },
              ...categories.map((category) => ({ value: category.id, label: getCategoryLabel(category) }))
            ]}
          />
          {fieldErrors.categoryId ? <p className="text-xs text-destructive">{fieldErrors.categoryId}</p> : null}
        </label>
        <label className="min-w-0 space-y-1 text-sm">
          <span>Limit</span>
          <Input
            className={`field-input ${fieldErrors.limit ? "border-destructive focus-visible:ring-destructive/40" : ""}`}
            value={state.limit}
            onChange={(event) => onFieldChange("limit", event.target.value)}
            placeholder={amountPlaceholder}
            inputMode="decimal"
            aria-invalid={Boolean(fieldErrors.limit)}
          />
          {fieldErrors.limit ? <p className="text-xs text-destructive">{fieldErrors.limit}</p> : null}
        </label>
        {problem ? <ProblemDetailsInline error={problem} /> : null}
      </div>
    </ModalForm>
  );
}
