import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import CategoryBreakdown from "@/features/analytics/components/CategoryBreakdown";

const items = [
  {
    category_id: "c1",
    category_name: "Food",
    income_total_cents: 1000,
    expense_total_cents: 3000,
    budget_spent_cents: 2500,
    budget_limit_cents: 5000
  },
  {
    category_id: "c2",
    category_name: "Salary",
    income_total_cents: 7000,
    expense_total_cents: 0,
    budget_spent_cents: 0,
    budget_limit_cents: 0
  }
];

describe("CategoryBreakdown", () => {
  it("renders expense-first sorting and no-budget fallback", () => {
    render(
      <CategoryBreakdown
        items={items}
        currencyCode="USD"
        metric="expense"
        onMetricChange={() => undefined}
        showBudgetOverlay
      />
    );

    const names = screen.getAllByTestId("category-name");
    expect(names[0]).toHaveTextContent("Food");
    expect(screen.getByText("No budget")).toBeInTheDocument();
  });

  it("triggers metric change and shows overlay-off copy", () => {
    const onMetricChange = vi.fn();
    render(
      <CategoryBreakdown
        items={items}
        currencyCode="USD"
        metric="income"
        onMetricChange={onMetricChange}
        showBudgetOverlay={false}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Expense categories" }));
    expect(onMetricChange).toHaveBeenCalledWith("expense");
    expect(screen.getAllByText("Overlay off").length).toBeGreaterThan(0);
  });

  it("renders income metric label and budget usage details", () => {
    render(
      <CategoryBreakdown
        items={items}
        currencyCode="USD"
        metric="income"
        onMetricChange={() => undefined}
        showBudgetOverlay
      />
    );

    expect(screen.getAllByText(/Income total/).length).toBeGreaterThan(0);
    expect(screen.getByText(/\$25\.00 \/ \$50\.00/)).toBeInTheDocument();
    expect(screen.getByText("50% used")).toBeInTheDocument();
  });
});
