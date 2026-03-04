/* c8 ignore file */
import type { FormEvent } from "react";

import ModalForm from "@/components/ModalForm";
import ProblemDetailsInline from "@/components/errors/ProblemDetailsInline";
import { Input } from "@/ui/input";

type Props = {
  open: boolean;
  goalName: string;
  amount: string;
  note: string;
  submitting: boolean;
  problem: unknown | null;
  onClose: () => void;
  onAmountChange: (value: string) => void;
  onNoteChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export default function SavingsContributionModal({
  open,
  goalName,
  amount,
  note,
  submitting,
  problem,
  onClose,
  onAmountChange,
  onNoteChange,
  onSubmit
}: Props) {
  return (
    <ModalForm
      open={open}
      title={`Add contribution: ${goalName}`}
      description="Record an amount in cents to move this goal forward."
      submitLabel="Add contribution"
      submitting={submitting}
      onClose={onClose}
      onSubmit={onSubmit}
    >
      <div className="grid gap-3 overflow-x-hidden">
        <label className="space-y-1 text-sm">
          <span>Amount (cents)</span>
          <Input value={amount} onChange={(event) => onAmountChange(event.target.value)} inputMode="numeric" placeholder="50000" />
        </label>
        <label className="space-y-1 text-sm">
          <span>Note</span>
          <Input value={note} onChange={(event) => onNoteChange(event.target.value)} placeholder="Optional" />
        </label>
        {problem ? <ProblemDetailsInline error={problem} /> : null}
      </div>
    </ModalForm>
  );
}
