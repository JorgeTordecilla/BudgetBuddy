import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import BudgetsTable from "@/features/budgets/components/BudgetsTable";

describe("BudgetsTable", () => {
  it("sorts by month desc then category label asc", () => {
    render(
      <BudgetsTable
        items={[
          {
            id: "b1",
            month: "2026-02",
            category_id: "c2",
            limit_cents: 1000,
            archived_at: null,
            created_at: "2026-02-01T00:00:00Z",
            updated_at: "2026-02-01T00:00:00Z"
          },
          {
            id: "b2",
            month: "2026-03",
            category_id: "c2",
            limit_cents: 2000,
            archived_at: null,
            created_at: "2026-03-01T00:00:00Z",
            updated_at: "2026-03-01T00:00:00Z"
          },
          {
            id: "b3",
            month: "2026-03",
            category_id: "c1",
            limit_cents: 3000,
            archived_at: null,
            created_at: "2026-03-01T00:00:00Z",
            updated_at: "2026-03-01T00:00:00Z"
          }
        ]}
        categoriesById={
          new Map([
            ["c1", { id: "c1", name: "Alpha", type: "expense", note: null, archived_at: null }],
            ["c2", { id: "c2", name: "Beta", type: "income", note: null, archived_at: null }]
          ])
        }
        formatMoney={(value) => String(value)}
        onEdit={() => undefined}
        onArchive={() => undefined}
      />
    );

    const rows = screen.getAllByRole("row");
    expect(within(rows[1]).getByText("2026-03")).toBeInTheDocument();
    expect(within(rows[1]).getByText("Alpha (expense)")).toBeInTheDocument();
    expect(within(rows[2]).getByText("2026-03")).toBeInTheDocument();
    expect(within(rows[2]).getByText("Beta (income)")).toBeInTheDocument();
    expect(within(rows[3]).getByText("2026-02")).toBeInTheDocument();
  });
});
