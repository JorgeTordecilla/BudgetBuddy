import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import MonthTrendChart from "@/features/analytics/components/MonthTrendChart";

describe("MonthTrendChart", () => {
  const items = [
    {
      month: "2026-02",
      income_total_cents: 10000,
      expense_total_cents: 5000,
      budget_spent_cents: 2000,
      budget_limit_cents: 0
    }
  ];

  it("shows no budget text when limit is zero", () => {
    render(<MonthTrendChart items={items} currencyCode="USD" showBudgetOverlay />);
    expect(screen.getAllByText("No budget").length).toBeGreaterThan(0);
  });

  it("hides budget columns when overlay is disabled", () => {
    render(<MonthTrendChart items={items} currencyCode="USD" showBudgetOverlay={false} />);
    expect(screen.getByText("-")).toBeInTheDocument();
  });

  it("handles zero income/expense rows without crashing", () => {
    render(
      <MonthTrendChart
        items={[
          {
            month: "2026-03",
            income_total_cents: 0,
            expense_total_cents: 0,
            budget_spent_cents: 0,
            budget_limit_cents: 0
          }
        ]}
        currencyCode="USD"
        showBudgetOverlay
      />
    );

    expect(screen.getAllByText("2026-03").length).toBeGreaterThan(0);
  });
});
