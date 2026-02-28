import { useMemo } from "react";

import type { Budget, Category } from "@/api/types";
import { useIsDesktop } from "@/hooks/useIsDesktop";
import { Button } from "@/ui/button";

type Props = {
  items: Budget[];
  categoriesById: Map<string, Category>;
  formatMoney: (amountCents: number) => string;
  onEdit: (budget: Budget) => void;
  onArchive: (budget: Budget) => void;
};

function getCategoryLabel(category: Category): string {
  return `${category.name} (${category.type})`;
}

export default function BudgetsTable({ items, categoriesById, formatMoney, onEdit, onArchive }: Props) {
  const isDesktop = useIsDesktop();
  const orderedItems = useMemo(
    () =>
      [...items].sort((left, right) => {
        if (left.month !== right.month) {
          return right.month.localeCompare(left.month);
        }
        const leftCategory = categoriesById.get(left.category_id);
        const rightCategory = categoriesById.get(right.category_id);
        const leftLabel = leftCategory ? getCategoryLabel(leftCategory) : left.category_id;
        const rightLabel = rightCategory ? getCategoryLabel(rightCategory) : right.category_id;
        return leftLabel.localeCompare(rightLabel);
      }),
    [items, categoriesById]
  );

  return (
    <div className="space-y-3 p-3 sm:p-4">
      {!isDesktop ? (
      <ul className="space-y-3">
        {orderedItems.map((budget) => {
          const category = categoriesById.get(budget.category_id);
          return (
            <li key={budget.id} className="surface-panel space-y-2 p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold">{budget.month}</p>
                  <p className="text-xs text-muted-foreground">{category ? getCategoryLabel(category) : budget.category_id}</p>
                </div>
                <span className="rounded-full border border-border/70 bg-muted/60 px-2 py-1 text-[11px] font-semibold">
                  {budget.archived_at ? "Archived" : "Active"}
                </span>
              </div>
              <p className="text-sm font-semibold tabular-nums">{formatMoney(budget.limit_cents)}</p>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => onEdit(budget)}>
                  Edit
                </Button>
                {!budget.archived_at ? (
                  <Button type="button" size="sm" onClick={() => onArchive(budget)}>
                    Archive
                  </Button>
                ) : null}
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
              <th className="px-3 py-2">Category</th>
              <th className="px-3 py-2 text-right">Limit</th>
              <th className="px-3 py-2">State</th>
              <th className="px-3 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {orderedItems.map((budget) => {
              const category = categoriesById.get(budget.category_id);
              return (
                <tr key={budget.id} className="border-t">
                  <td className="px-3 py-2">{budget.month}</td>
                  <td className="px-3 py-2">{category ? getCategoryLabel(category) : budget.category_id}</td>
                  <td className="px-3 py-2 text-right">{formatMoney(budget.limit_cents)}</td>
                  <td className="px-3 py-2">{budget.archived_at ? "Archived" : "Active"}</td>
                  <td className="px-3 py-2 text-right">
                    <div className="flex flex-wrap justify-end gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => onEdit(budget)}>
                        Edit
                      </Button>
                      {!budget.archived_at ? (
                        <Button type="button" size="sm" onClick={() => onArchive(budget)}>
                          Archive
                        </Button>
                      ) : null}
                    </div>
                  </td>
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
