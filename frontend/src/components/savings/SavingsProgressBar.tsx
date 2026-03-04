/* c8 ignore file */
import { cn } from "@/lib/utils";

type Props = {
  progressPct: number;
};

export default function SavingsProgressBar({ progressPct }: Props) {
  const normalized = Math.max(0, Math.min(progressPct, 100));
  return (
    <div className="space-y-1">
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "h-full rounded-full bg-primary transition-all",
            progressPct >= 100 ? "bg-emerald-500" : "bg-primary"
          )}
          style={{ width: `${normalized}%` }}
        />
      </div>
      <p className="text-xs text-muted-foreground">{progressPct.toFixed(1)}%</p>
    </div>
  );
}
