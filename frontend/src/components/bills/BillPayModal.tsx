import type { FormEvent } from "react";

import ModalForm from "@/components/ModalForm";
import ProblemDetailsInline from "@/components/errors/ProblemDetailsInline";
import { Input } from "@/ui/input";

type Props = {
  open: boolean;
  billName: string;
  accountName: string;
  categoryName: string;
  amount: string;
  submitting: boolean;
  problem: unknown | null;
  onClose: () => void;
  onAmountChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export default function BillPayModal({
  open,
  billName,
  accountName,
  categoryName,
  amount,
  submitting,
  problem,
  onClose,
  onAmountChange,
  onSubmit
}: Props) {
  return (
    <ModalForm
      open={open}
      title={`Mark as paid: ${billName}`}
      description="Confirm the real payment amount for this month."
      submitLabel="Mark paid"
      submitting={submitting}
      onClose={onClose}
      onSubmit={onSubmit}
    >
      <div className="grid gap-3 overflow-x-hidden">
        <label className="space-y-1 text-sm">
          <span>Actual amount (cents)</span>
          <Input
            value={amount}
            onChange={(event) => onAmountChange(event.target.value)}
            inputMode="numeric"
            placeholder="0"
          />
        </label>

        <div className="rounded-lg border border-border/70 bg-muted/30 p-3 text-sm">
          <p>
            <strong>Account:</strong> {accountName}
          </p>
          <p>
            <strong>Category:</strong> {categoryName}
          </p>
        </div>

        <p className="text-xs text-muted-foreground">Editing amount? Unmark and re-pay with the correct value.</p>

        {problem ? <ProblemDetailsInline error={problem} /> : null}
      </div>
    </ModalForm>
  );
}
