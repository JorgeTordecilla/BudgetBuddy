import type { FormEvent } from "react";

import type { Account, Category, TransactionType } from "@/api/types";
import ProblemDetailsInline from "@/components/errors/ProblemDetailsInline";
import ModalForm from "@/components/ModalForm";

export type TransactionFormState = {
  type: TransactionType;
  accountId: string;
  categoryId: string;
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
      <div className="grid gap-3">
        <label className="space-y-1 text-sm">
          <span>Type</span>
          <select
            className="w-full rounded-md border px-3 py-2"
            value={state.type}
            onChange={(event) => onFieldChange("type", event.target.value)}
          >
            <option value="expense">expense</option>
            <option value="income">income</option>
          </select>
        </label>
        <label className="space-y-1 text-sm">
          <span>Account</span>
          <select
            className="w-full rounded-md border px-3 py-2"
            value={state.accountId}
            onChange={(event) => onFieldChange("accountId", event.target.value)}
          >
            <option value="" disabled>
              Select account
            </option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-sm">
          <span>Category</span>
          <select
            className="w-full rounded-md border px-3 py-2"
            value={state.categoryId}
            onChange={(event) => onFieldChange("categoryId", event.target.value)}
          >
            <option value="" disabled>
              Select category
            </option>
            {visibleCategories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-sm">
          <span>Amount (cents)</span>
          <input
            className="w-full rounded-md border px-3 py-2"
            value={state.amountCents}
            onChange={(event) => onFieldChange("amountCents", event.target.value)}
            required={!isEdit}
          />
        </label>
        <label className="space-y-1 text-sm">
          <span>Date</span>
          <input
            className="w-full rounded-md border px-3 py-2"
            type="date"
            value={state.date}
            onChange={(event) => onFieldChange("date", event.target.value)}
            required={!isEdit}
          />
        </label>
        <label className="space-y-1 text-sm">
          <span>Merchant</span>
          <input
            className="w-full rounded-md border px-3 py-2"
            value={state.merchant}
            onChange={(event) => onFieldChange("merchant", event.target.value)}
          />
        </label>
        <label className="space-y-1 text-sm">
          <span>Note</span>
          <textarea
            className="w-full rounded-md border px-3 py-2"
            value={state.note}
            onChange={(event) => onFieldChange("note", event.target.value)}
            rows={3}
          />
        </label>
        {problem ? <ProblemDetailsInline error={problem} /> : null}
      </div>
    </ModalForm>
  );
}
