import type { AnalyticsByCategoryItem } from "@/api/types";
import { budgetUsagePercent, formatCents } from "@/utils/money";

type MetricType = "expense" | "income";

type Props = {
  items: AnalyticsByCategoryItem[];
  currencyCode: string;
  metric: MetricType;
  onMetricChange: (metric: MetricType) => void;
  showBudgetOverlay: boolean;
};

export default function CategoryBreakdown({ items, currencyCode, metric, onMetricChange, showBudgetOverlay }: Props) {
  const sorted = [...items].sort((a, b) => {
    const left = metric === "expense" ? a.expense_total_cents : a.income_total_cents;
    const right = metric === "expense" ? b.expense_total_cents : b.income_total_cents;
    return right - left;
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <button
          type="button"
          className={`rounded-md px-3 py-1 text-sm ${metric === "expense" ? "bg-muted font-medium" : "border"}`}
          onClick={() => onMetricChange("expense")}
        >
          Expense categories
        </button>
        <button
          type="button"
          className={`rounded-md px-3 py-1 text-sm ${metric === "income" ? "bg-muted font-medium" : "border"}`}
          onClick={() => onMetricChange("income")}
        >
          Income categories
        </button>
      </div>

      <div className="space-y-2">
        {sorted.map((item) => {
          const total = metric === "expense" ? item.expense_total_cents : item.income_total_cents;
          const spent = item.budget_spent_cents ?? 0;
          const limit = item.budget_limit_cents ?? 0;
          const usage = budgetUsagePercent(spent, limit);
          return (
            <div key={item.category_id} className="rounded-lg border p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium" data-testid="category-name">{item.category_name}</p>
                  <p className="text-sm text-muted-foreground">
                    {metric === "expense" ? "Expense total" : "Income total"}: {formatCents(currencyCode, total)}
                  </p>
                </div>
                {showBudgetOverlay ? (
                  <div className="text-right text-sm">
                    {limit > 0 ? (
                      <>
                        <p>{formatCents(currencyCode, spent)} / {formatCents(currencyCode, limit)}</p>
                        <p className="text-muted-foreground">{usage ?? 0}% used</p>
                      </>
                    ) : (
                      <p className="text-muted-foreground">No budget</p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Overlay off</p>
                )}
              </div>
              {showBudgetOverlay && limit > 0 ? (
                <div className="mt-2 h-2 rounded bg-muted">
                  <div
                    className="h-2 rounded bg-primary"
                    style={{ width: `${Math.min(100, usage ?? 0)}%` }}
                  />
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
