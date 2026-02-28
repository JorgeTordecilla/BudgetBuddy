import type { AnalyticsByMonthItem } from "@/api/types";
import { useIsDesktop } from "@/hooks/useIsDesktop";
import { budgetUsagePercent, formatCents } from "@/utils/money";

type Props = {
  items: AnalyticsByMonthItem[];
  currencyCode: string;
  showBudgetOverlay: boolean;
};

function maxValue(items: AnalyticsByMonthItem[]): number {
  return items.reduce((max, item) => Math.max(max, item.income_total_cents, item.expense_total_cents), 0) || 1;
}

export default function MonthTrendChart({ items, currencyCode, showBudgetOverlay }: Props) {
  const isDesktop = useIsDesktop();
  const peak = maxValue(items);

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {items.map((item) => {
          const incomeWidth = Math.round((item.income_total_cents / peak) * 100);
          const expenseWidth = Math.round((item.expense_total_cents / peak) * 100);
          return (
            <div key={item.month} className="space-y-1">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{item.month}</span>
                <span>
                  Income {formatCents(currencyCode, item.income_total_cents)} | Expense {formatCents(currencyCode, item.expense_total_cents)}
                </span>
              </div>
              <div className="space-y-1">
                <div className="h-2 rounded bg-emerald-100">
                  <div className="h-2 rounded bg-emerald-500" style={{ width: `${incomeWidth}%` }} />
                </div>
                <div className="h-2 rounded bg-rose-100">
                  <div className="h-2 rounded bg-rose-500" style={{ width: `${expenseWidth}%` }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {!isDesktop ? (
      <ul className="space-y-2">
        {items.map((item) => {
          const spent = item.budget_spent_cents ?? 0;
          const limit = item.budget_limit_cents ?? 0;
          const usage = budgetUsagePercent(spent, limit);
          return (
            <li key={item.month} className="surface-panel space-y-2 p-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">{item.month}</p>
                <p className="text-xs text-muted-foreground">
                  {showBudgetOverlay && usage !== null ? `${usage}% used` : "No budget"}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <p>Income: {formatCents(currencyCode, item.income_total_cents)}</p>
                <p>Expense: {formatCents(currencyCode, item.expense_total_cents)}</p>
                <p>Net: {formatCents(currencyCode, item.income_total_cents - item.expense_total_cents)}</p>
                <p>
                  Budget: {showBudgetOverlay && limit > 0 ? formatCents(currencyCode, spent) : "No budget"}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
      ) : null}

      {isDesktop ? (
      <div className="overflow-x-auto">
        <table className="min-w-[760px] w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="px-3 py-2">Month</th>
              <th className="px-3 py-2 text-right">Income</th>
              <th className="px-3 py-2 text-right">Expense</th>
              <th className="px-3 py-2 text-right">Net</th>
              <th className="px-3 py-2 text-right">Budget spent</th>
              <th className="px-3 py-2 text-right">Budget limit</th>
              <th className="px-3 py-2 text-right">% used</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const spent = item.budget_spent_cents ?? 0;
              const limit = item.budget_limit_cents ?? 0;
              const usage = budgetUsagePercent(spent, limit);
              return (
                <tr key={item.month} className="border-t">
                  <td className="px-3 py-2">{item.month}</td>
                  <td className="px-3 py-2 text-right">{formatCents(currencyCode, item.income_total_cents)}</td>
                  <td className="px-3 py-2 text-right">{formatCents(currencyCode, item.expense_total_cents)}</td>
                  <td className="px-3 py-2 text-right">{formatCents(currencyCode, item.income_total_cents - item.expense_total_cents)}</td>
                  <td className="px-3 py-2 text-right">{showBudgetOverlay ? formatCents(currencyCode, spent) : "-"}</td>
                  <td className="px-3 py-2 text-right">{showBudgetOverlay && limit > 0 ? formatCents(currencyCode, limit) : "No budget"}</td>
                  <td className="px-3 py-2 text-right">{showBudgetOverlay && usage !== null ? `${usage}%` : "No budget"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      ) : null}
    </div>
  );
}
