import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, useNavigate } from "react-router-dom";

import { getAnalyticsByCategory, getAnalyticsByMonth, getAnalyticsIncome, getImpulseSummary } from "@/api/analytics";
import { listAccounts } from "@/api/accounts";
import { listCategories } from "@/api/categories";
import { ApiProblemError } from "@/api/problem";
import { applyRollover, getRolloverPreview } from "@/api/rollover";
import type { ApiClient } from "@/api/client";
import { AuthContext } from "@/auth/AuthContext";
import AnalyticsPage from "@/features/analytics/AnalyticsPage";

vi.mock("@/api/analytics", () => ({
  getAnalyticsByMonth: vi.fn(),
  getAnalyticsByCategory: vi.fn(),
  getAnalyticsIncome: vi.fn(),
  getImpulseSummary: vi.fn()
}));
vi.mock("@/api/rollover", () => ({
  getRolloverPreview: vi.fn(),
  applyRollover: vi.fn(),
}));
vi.mock("@/api/accounts", () => ({ listAccounts: vi.fn() }));
vi.mock("@/api/categories", () => ({ listCategories: vi.fn() }));

const apiClientStub = {} as ApiClient;

function renderPage(initialEntries = ["/app/analytics"], currencyCode = "USD") {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
  });
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <QueryClientProvider client={queryClient}>
        <AuthContext.Provider
          value={{
            apiClient: apiClientStub,
            user: { id: "u1", username: "demo", currency_code: currencyCode },
            accessToken: "token",
            isAuthenticated: true,
            isBootstrapping: false,
            login: async () => undefined,
            register: async () => undefined,
            logout: async () => undefined,
            bootstrapSession: async () => true
          }}
        >
          <AnalyticsPage />
        </AuthContext.Provider>
      </QueryClientProvider>
    </MemoryRouter>
  );
}

describe("AnalyticsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getAnalyticsByMonth).mockResolvedValue({
      items: [
        {
          month: "2026-02",
          income_total_cents: 500000,
          expense_total_cents: 300000,
          expected_income_cents: 550000,
          actual_income_cents: 500000,
          rollover_in_cents: 9000,
          budget_spent_cents: 250000,
          budget_limit_cents: 350000
        }
      ]
    });
    vi.mocked(getAnalyticsByCategory).mockResolvedValue({
      items: [
        {
          category_id: "c-expense",
          category_name: "Food",
          category_type: "expense",
          income_total_cents: 10000,
          expense_total_cents: 200000,
          budget_spent_cents: 150000,
          budget_limit_cents: 250000
        },
        {
          category_id: "c-income",
          category_name: "Salary",
          category_type: "income",
          income_total_cents: 350000,
          expense_total_cents: 0,
          budget_spent_cents: 0,
          budget_limit_cents: 400000
        }
      ]
    });
    vi.mocked(getAnalyticsIncome).mockResolvedValue({
      items: [
        {
          month: "2026-02",
          expected_income_cents: 550000,
          actual_income_cents: 500000,
          rows: [
            {
              income_source_id: "s1",
              income_source_name: "Paycheck 1",
              expected_income_cents: 550000,
              actual_income_cents: 500000
            }
          ]
        }
      ]
    });
    vi.mocked(getRolloverPreview).mockResolvedValue({
      month: "2026-02",
      surplus_cents: 9000,
      already_applied: false,
      applied_transaction_id: null,
    });
    vi.mocked(applyRollover).mockResolvedValue({
      source_month: "2026-02",
      target_month: "2026-03",
      transaction_id: "tx-rollover",
      amount_cents: 9000,
    });
    vi.mocked(listAccounts).mockResolvedValue({ items: [{ id: "a1", name: "Cash", type: "cash", initial_balance_cents: 0, archived_at: null }], next_cursor: null });
    vi.mocked(listCategories).mockResolvedValue({ items: [{ id: "c-income", name: "Salary", type: "income", archived_at: null }], next_cursor: null });
    vi.mocked(getImpulseSummary).mockResolvedValue({
      impulse_count: 2,
      intentional_count: 4,
      untagged_count: 1,
      top_impulse_categories: [{ category_id: "c-expense", category_name: "Food", count: 2 }]
    });
  });

  it("renders invalid-date-range feedback from backend problem details", async () => {
    vi.mocked(getAnalyticsByMonth).mockRejectedValueOnce(
      new ApiProblemError(400, {
        type: "https://api.budgetbuddy.dev/problems/invalid-date-range",
        title: "",
        status: 400
      })
    );

    renderPage();
    expect(await screen.findByText(/Invalid date range/)).toBeInTheDocument();
  });

  it("switches category metric between expense and income views", async () => {
    renderPage();
    await screen.findAllByTestId("category-name");

    let names = screen.getAllByTestId("category-name");
    expect(names[0]).toHaveTextContent("Food");
    expect(screen.queryByText("Salary")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Income categories" }));

    await waitFor(() => {
      names = screen.getAllByTestId("category-name");
      expect(names[0]).toHaveTextContent("Salary");
      expect(names.some((entry) => entry.textContent?.includes("Food"))).toBe(false);
    });
    expect(screen.getByText(/\$3,500\.00 \/ \$4,000\.00/)).toBeInTheDocument();
    expect(screen.getByText("88% achieved")).toBeInTheDocument();
  });

  it("shows inline validation for invalid local date range on apply", async () => {
    renderPage();
    await screen.findAllByTestId("category-name");

    expect(screen.getByLabelText("From date", { selector: "input" })).toHaveClass("field-date-input");
    expect(screen.getByLabelText("To date", { selector: "input" })).toHaveClass("field-date-input");

    fireEvent.change(screen.getByLabelText("From date", { selector: "input" }), { target: { value: "2026-03-31" } });
    fireEvent.change(screen.getByLabelText("To date", { selector: "input" }), { target: { value: "2026-03-01" } });
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));

    expect(screen.getByText("From date must be on or before To date.")).toBeInTheDocument();
  });

  it("uses valid URL query range as initial applied range", async () => {
    renderPage(["/app/analytics?from=2026-02-01&to=2026-02-28"]);

    await waitFor(() =>
      expect(getAnalyticsByMonth).toHaveBeenCalledWith(apiClientStub, { from: "2026-02-01", to: "2026-02-28" })
    );
  });

  it("resyncs analytics range when URL query changes after mount", async () => {
    function Harness() {
      const navigate = useNavigate();
      return (
        <>
          <button
            type="button"
            onClick={() => navigate("/app/analytics?from=2026-02-01&to=2026-02-28")}
          >
            Navigate with range
          </button>
          <AnalyticsPage />
        </>
      );
    }

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
    });
    render(
      <MemoryRouter initialEntries={["/app/analytics"]}>
        <QueryClientProvider client={queryClient}>
          <AuthContext.Provider
            value={{
              apiClient: apiClientStub,
              user: { id: "u1", username: "demo", currency_code: "USD" },
              accessToken: "token",
              isAuthenticated: true,
              isBootstrapping: false,
              login: async () => undefined,
              register: async () => undefined,
              logout: async () => undefined,
              bootstrapSession: async () => true
            }}
          >
            <Harness />
          </AuthContext.Provider>
        </QueryClientProvider>
      </MemoryRouter>
    );
    await screen.findAllByTestId("category-name");

    fireEvent.click(screen.getByRole("button", { name: "Navigate with range" }));

    await waitFor(() =>
      expect(getAnalyticsByMonth).toHaveBeenLastCalledWith(apiClientStub, { from: "2026-02-01", to: "2026-02-28" })
    );
  });

  it("shows retry-after hint on 429 response", async () => {
    const rateError = new ApiProblemError(429, {
      type: "about:blank",
      title: "Too Many Requests",
      status: 429
    }) as ApiProblemError & { retryAfter: string };
    rateError.retryAfter = "30";
    vi.mocked(getAnalyticsByMonth).mockRejectedValueOnce(rateError);

    renderPage();
    expect(await screen.findByText("Unexpected error. Please retry.")).toBeInTheDocument();
    expect(screen.getByText("Retry-After: 30s")).toBeInTheDocument();
  });

  it("shows fallback problem banner when error is not ProblemDetails", async () => {
    vi.mocked(getAnalyticsByMonth).mockRejectedValueOnce(new Error("boom"));

    renderPage();
    expect(await screen.findByText("Unexpected error. Please retry.")).toBeInTheDocument();
  });

  it("shows category analytics problem when category query fails", async () => {
    vi.mocked(getAnalyticsByCategory).mockRejectedValueOnce(
      new ApiProblemError(406, {
        type: "about:blank",
        title: "",
        status: 406
      })
    );

    renderPage();
    expect(await screen.findByText("Client contract error. Please refresh.")).toBeInTheDocument();
  });

  it("shows no budget period copy when overlay is enabled and no limits exist", async () => {
    vi.mocked(getAnalyticsByMonth).mockResolvedValueOnce({
      items: [
        {
          month: "2026-02",
          income_total_cents: 500000,
          expense_total_cents: 300000,
          expected_income_cents: 0,
          actual_income_cents: 500000,
          budget_spent_cents: 0,
          budget_limit_cents: 0
        }
      ]
    });
    vi.mocked(getAnalyticsByCategory).mockResolvedValueOnce({
      items: [
        {
          category_id: "c-expense",
          category_name: "Food",
          category_type: "expense",
          income_total_cents: 0,
          expense_total_cents: 200000,
          budget_spent_cents: 0,
          budget_limit_cents: 0
        }
      ]
    });

    renderPage();
    expect(await screen.findByText("No budgets set for this period.")).toBeInTheDocument();
  });

  it("keeps generic 400 errors in the banner instead of inline range message", async () => {
    vi.mocked(getAnalyticsByMonth).mockRejectedValueOnce(
      new ApiProblemError(400, {
        type: "about:blank",
        title: "",
        status: 400
      })
    );

    renderPage();
    expect(await screen.findByText("Validation failed. Check your input and try again.")).toBeInTheDocument();
    expect(screen.queryByText("Invalid date range")).not.toBeInTheDocument();
  });

  it("shows budget usage denominator from expense budgets only", async () => {
    vi.mocked(getAnalyticsByCategory).mockResolvedValueOnce({
      items: [
        {
          category_id: "c-expense",
          category_name: "Food",
          category_type: "expense",
          income_total_cents: 0,
          expense_total_cents: 200000,
          budget_spent_cents: 150000,
          budget_limit_cents: 250000
        },
        {
          category_id: "c-income",
          category_name: "Salary",
          category_type: "income",
          income_total_cents: 350000,
          expense_total_cents: 0,
          budget_spent_cents: 0,
          budget_limit_cents: 0
        }
      ]
    });

    renderPage();
    expect(await screen.findAllByText(/\$1,500\.00 \/ \$2,500\.00/)).toHaveLength(2);
  });

  it("keeps expected vs actual income scale-correct for large COP values", async () => {
    vi.mocked(getAnalyticsByMonth).mockResolvedValueOnce({
      items: [
        {
          month: "2026-02",
          income_total_cents: 400000000,
          expense_total_cents: 120000000,
          expected_income_cents: 400000000,
          actual_income_cents: 400000000,
          budget_spent_cents: 0,
          budget_limit_cents: 0
        }
      ]
    });
    vi.mocked(getAnalyticsIncome).mockResolvedValueOnce({
      items: [
        {
          month: "2026-02",
          expected_income_cents: 400000000,
          actual_income_cents: 400000000,
          rows: [
            {
              income_source_id: "s1",
              income_source_name: "Paycheck 1",
              expected_income_cents: 400000000,
              actual_income_cents: 400000000
            }
          ]
        }
      ]
    });

    renderPage(["/app/analytics"], "COP");
    expect((await screen.findAllByText(/400,000,000/)).length).toBeGreaterThan(0);
  });

  it("shows rollover KPI and allows apply action from monthly rollover section", async () => {
    vi.mocked(getRolloverPreview)
      .mockResolvedValueOnce({
        month: "2026-02",
        surplus_cents: 9000,
        already_applied: false,
        applied_transaction_id: null,
      })
      .mockResolvedValue({
        month: "2026-02",
        surplus_cents: 9000,
        already_applied: true,
        applied_transaction_id: "tx-rollover",
      });

    renderPage();
    expect(await screen.findByRole("button", { name: "Apply rollover →" })).toBeInTheDocument();
    expect(screen.getAllByText("$90.00").length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: "Apply rollover →" }));
    expect(await screen.findByText("Apply rollover")).toBeInTheDocument();
    await screen.findByRole("option", { name: "Cash" });
    await screen.findByRole("option", { name: "Salary" });
    await waitFor(() => expect(screen.getByRole("button", { name: "Confirm apply" })).toBeEnabled());
    fireEvent.click(screen.getByRole("button", { name: "Confirm apply" }));
    await waitFor(() =>
      expect(applyRollover).toHaveBeenCalledWith(apiClientStub, {
        source_month: "2026-02",
        account_id: "a1",
        category_id: "c-income",
      })
    );
    expect(await screen.findByText("Applied")).toBeInTheDocument();
  });

  it("renders impulse KPI cards and top categories", async () => {
    renderPage();
    expect(await screen.findByText("Impulse")).toBeInTheDocument();
    expect(screen.getByText("Intentional")).toBeInTheDocument();
    expect(screen.getByText("Top impulse categories")).toBeInTheDocument();
    expect(screen.getAllByText("Food").length).toBeGreaterThan(0);
    expect(screen.getAllByText("2").length).toBeGreaterThan(0);
  });

  it("renders impulse zero state when no transactions exist in range", async () => {
    vi.mocked(getImpulseSummary).mockResolvedValueOnce({
      impulse_count: 0,
      intentional_count: 0,
      untagged_count: 0,
      top_impulse_categories: []
    });

    renderPage();
    expect(await screen.findByText("No tagged transactions yet.")).toBeInTheDocument();
  });

  it("renders impulse empty-state copy when summary payload is missing", async () => {
    vi.mocked(getImpulseSummary).mockResolvedValueOnce(null as never);

    renderPage();
    expect(await screen.findByText("No tagged transactions yet.")).toBeInTheDocument();
  });

  it("shows non-blocking impulse error while keeping analytics content visible", async () => {
    vi.mocked(getImpulseSummary).mockRejectedValueOnce(
      new ApiProblemError(400, {
        type: "about:blank",
        title: "Invalid request",
        status: 400
      })
    );

    renderPage();
    expect(await screen.findByText("Validation failed. Check your input and try again.")).toBeInTheDocument();
    expect(screen.getByText("Monthly trend")).toBeInTheDocument();
  });
});
