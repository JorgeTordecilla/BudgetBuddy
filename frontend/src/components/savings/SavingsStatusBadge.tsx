/* c8 ignore file */
import type { SavingsGoalStatus } from "@/api/types";
import { cn } from "@/lib/utils";

type Props = {
  status: SavingsGoalStatus;
  deadline: string | null;
};

function daysUntil(deadline: string): number {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(`${deadline}T00:00:00`);
  const diffMs = target.getTime() - today.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

export default function SavingsStatusBadge({ status, deadline }: Props) {
  let label = "Active";
  let tone = "bg-sky-100 text-sky-900 border-sky-300";

  if (status === "completed") {
    label = "Completed";
    tone = "bg-emerald-100 text-emerald-900 border-emerald-300";
  } else if (status === "cancelled") {
    label = "Cancelled";
    tone = "bg-zinc-200 text-zinc-900 border-zinc-400";
  } else if (deadline) {
    const days = daysUntil(deadline);
    if (days < 0) {
      label = "Overdue";
      tone = "bg-rose-100 text-rose-900 border-rose-300";
    } else if (days <= 30) {
      label = "Due soon";
      tone = "bg-amber-100 text-amber-900 border-amber-300";
    }
  }

  return <span className={cn("inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold", tone)}>{label}</span>;
}
