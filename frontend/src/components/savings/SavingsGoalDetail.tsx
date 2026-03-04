/* c8 ignore file */
import type { SavingsGoalDetail } from "@/api/types";
import { Button } from "@/ui/button";
import { formatCents } from "@/utils/money";

type Props = {
  goal: SavingsGoalDetail;
  currencyCode: string;
  onDeleteContribution: (contributionId: string) => void;
  deletingContributionId: string | null;
};

export default function SavingsGoalDetail({ goal, currencyCode, onDeleteContribution, deletingContributionId }: Props) {
  return (
    <div className="grid gap-3 rounded-lg border border-border/70 bg-muted/20 p-3">
      <div className="grid gap-1 text-sm">
        <p>
          <strong>Saved:</strong> {formatCents(currencyCode, goal.saved_cents)}
        </p>
        <p>
          <strong>Remaining:</strong> {formatCents(currencyCode, goal.remaining_cents)}
        </p>
        <p>
          <strong>Progress:</strong> {goal.progress_pct.toFixed(1)}%
        </p>
      </div>
      <div className="grid gap-2">
        <h4 className="text-sm font-semibold">Recent contributions</h4>
        {goal.contributions.length === 0 ? <p className="text-sm text-muted-foreground">No contributions yet.</p> : null}
        {goal.contributions.map((item) => (
          <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border/60 bg-background px-3 py-2 text-sm">
            <div>
              <p className="font-medium">{formatCents(currencyCode, item.amount_cents)}</p>
              <p className="text-xs text-muted-foreground">{item.note || "No note"}</p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onDeleteContribution(item.id)}
              disabled={deletingContributionId === item.id}
            >
              Delete
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
