import type { FormEvent } from "react";

import type { Account, Category, IncomeSource, TransactionType } from "@/api/types";
import DatePickerField from "@/components/DatePickerField";
import SelectField from "@/components/SelectField";
import ProblemDetailsInline from "@/components/errors/ProblemDetailsInline";
import ModalForm from "@/components/ModalForm";
import { Input } from "@/ui/input";
import { Textarea } from "@/ui/textarea";

export type TransactionFormState = {
  type: TransactionType;
  accountId: string;
  categoryId: string;
  incomeSourceId: string;
  amountCents: string;
  date: string;
  merchant: string;
  note: string;
};

type TransactionFormProps = {
  open: boolean;
  title: string;
  submitLabel: string;
  submitting?: boolean;
  state: TransactionFormState;
  accounts: Account[];
  categories: Category[];
  incomeSources?: IncomeSource[];
  problem: unknown | null;
  onFieldChange: (field: keyof TransactionFormState, value: string) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  isEdit?: boolean;
};

export default function TransactionForm({
  open,
  title,
  submitLabel,
  submitting = false,
  state,
  accounts,
  categories,
  incomeSources = [],
  problem,
  onFieldChange,
  onClose,
  onSubmit,
  isEdit = false
}: TransactionFormProps) {
  const visibleCategories = categories.filter((category) => category.type === state.type);

  return (
    <ModalForm
      open={open}
      title={title}
      description="Use integer cents and date format YYYY-MM-DD."
      submitLabel={submitLabel}
      submitting={submitting}
      onClose={onClose}
      onSubmit={onSubmit}
    >
      <div className="grid gap-3 overflow-x-hidden">
        <label className="min-w-0 space-y-1 text-sm">
          <span>Type</span>
          <SelectField
            ariaLabel="Type"
            value={state.type}
            onChange={(value) => onFieldChange("type", value)}
            options={[
              { value: "expense", label: "expense" },
              { value: "income", label: "income" }
            ]}
          />
        </label>
        <label className="min-w-0 space-y-1 text-sm">
          <span>Account</span>
          <SelectField
            ariaLabel="Account"
            value={state.accountId}
            onChange={(value) => onFieldChange("accountId", value)}
            options={[
              { value: "", label: "Select account", disabled: true },
              ...accounts.map((account) => ({ value: account.id, label: account.name }))
            ]}
          />
        </label>
        <label className="min-w-0 space-y-1 text-sm">
          <span>Category</span>
          <SelectField
            ariaLabel="Category"
            value={state.categoryId}
            onChange={(value) => onFieldChange("categoryId", value)}
            options={[
              { value: "", label: "Select category", disabled: true },
              ...visibleCategories.map((category) => ({ value: category.id, label: category.name }))
            ]}
          />
        </label>
        {state.type === "income" ? (
          <label className="min-w-0 space-y-1 text-sm">
            <span>Income source</span>
            <SelectField
              ariaLabel="Income source"
              value={state.incomeSourceId}
              onChange={(value) => onFieldChange("incomeSourceId", value)}
              options={[
                { value: "", label: "Unassigned" },
                ...incomeSources
                  .filter((source) => !source.archived_at)
                  .map((source) => ({ value: source.id, label: source.name }))
              ]}
            />
          </label>
        ) : null}
        <label className="min-w-0 space-y-1 text-sm">
          <span>Amount (cents)</span>
          <Input
            className="field-input"
            value={state.amountCents}
            onChange={(event) => onFieldChange("amountCents", event.target.value)}
            required={!isEdit}
          />
        </label>
        <label className="min-w-0 w-full space-y-1 text-sm">
          <span>Date</span>
          <DatePickerField
            mode="date"
            ariaLabel="Date"
            value={state.date}
            onChange={(value) => onFieldChange("date", value)}
          />
        </label>
        <label className="min-w-0 space-y-1 text-sm">
          <span>Merchant</span>
          <Input
            className="field-input"
            value={state.merchant}
            onChange={(event) => onFieldChange("merchant", event.target.value)}
          />
        </label>
        <label className="min-w-0 space-y-1 text-sm">
          <span>Note</span>
          <Textarea
            className="field-input h-10 min-h-10 resize-none"
            value={state.note}
            onChange={(event) => onFieldChange("note", event.target.value)}
            rows={1}
          />
        </label>
        {problem ? <ProblemDetailsInline error={problem} /> : null}
      </div>
    </ModalForm>
  );
}
