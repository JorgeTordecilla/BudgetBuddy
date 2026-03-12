import type { FormEvent } from "react";

import type { Account, Category, IncomeSource, TransactionMood, TransactionType } from "@/api/types";
import DatePickerField from "@/components/DatePickerField";
import SelectField from "@/components/SelectField";
import ProblemDetailsInline from "@/components/errors/ProblemDetailsInline";
import ModalForm from "@/components/ModalForm";
import { Input } from "@/ui/input";
import { Textarea } from "@/ui/textarea";
import { centsToInputValue, resolveMinorUnits } from "@/utils/money";

export type TransactionFormState = {
  type: TransactionType;
  accountId: string;
  categoryId: string;
  incomeSourceId: string;
  mood: TransactionMood | "";
  impulseTag: "" | "intentional" | "impulsive";
  amount: string;
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
  currencyCode?: string;
  problem: unknown;
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
  currencyCode = "USD",
  problem,
  onFieldChange,
  onClose,
  onSubmit,
  isEdit = false
}: TransactionFormProps) {
  const visibleCategories = categories.filter((category) => category.type === state.type);
  const unitFactor = 10 ** resolveMinorUnits(currencyCode);
  const amountExample = centsToInputValue(currencyCode, 4_000_000 * unitFactor);
  const amountPlaceholder = centsToInputValue(currencyCode, 0);

  return (
    <ModalForm
      open={open}
      title={title}
      description={`Enter amount in ${currencyCode} major units (for example ${amountExample}) and date format YYYY-MM-DD.`}
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
          <span>Amount</span>
          <Input
            className="field-input"
            value={state.amount}
            onChange={(event) => onFieldChange("amount", event.target.value)}
            placeholder={amountPlaceholder}
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
          <span>Mood</span>
          <SelectField
            ariaLabel="Mood"
            value={state.mood}
            onChange={(value) => onFieldChange("mood", value)}
            options={[
              { value: "", label: "No mood" },
              { value: "happy", label: "😊 Happy" },
              { value: "neutral", label: "🙂 Neutral" },
              { value: "sad", label: "😢 Sad" },
              { value: "anxious", label: "🥺 Anxious" },
              { value: "bored", label: "🥱 Bored" }
            ]}
          />
        </label>
        <label className="min-w-0 space-y-1 text-sm">
          <span>Impulse buy?</span>
          <SelectField
            ariaLabel="Impulse buy?"
            value={state.impulseTag}
            onChange={(value) => onFieldChange("impulseTag", value)}
            options={[
              { value: "", label: "Untagged" },
              { value: "intentional", label: "Intentional" },
              { value: "impulsive", label: "Impulsive" }
            ]}
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
