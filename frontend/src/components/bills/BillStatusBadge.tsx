import type { BillMonthlyStatus } from "@/api/types";
import { cn } from "@/lib/utils";

type Props = {
  status: BillMonthlyStatus;
};

const statusLabel: Record<BillMonthlyStatus, string> = {
  paid: "Paid",
  pending: "Pending",
  overdue: "Overdue"
};

const statusClass: Record<BillMonthlyStatus, string> = {
  paid: "bg-emerald-100 text-emerald-900 border-emerald-300",
  pending: "bg-amber-100 text-amber-900 border-amber-300",
  overdue: "bg-rose-100 text-rose-900 border-rose-300"
};

export default function BillStatusBadge({ status }: Props) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold",
        statusClass[status]
      )}
    >
      {statusLabel[status]}
    </span>
  );
}
