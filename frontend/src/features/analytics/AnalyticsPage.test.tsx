import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, useNavigate } from "react-router-dom";

import { getAnalyticsByCategory, getAnalyticsByMonth } from "@/api/analytics";
import { ApiProblemError } from "@/api/problem";
import type { ApiClient } from "@/api/client";
import { AuthContext } from "@/auth/AuthContext";
import AnalyticsPage from "@/features/analytics/AnalyticsPage";

vi.mock("@/api/analytics", () => ({
  getAnalyticsByMonth: vi.fn(),
  getAnalyticsByCategory: vi.fn()
}));

const apiClientStub = {} as ApiClient;

function renderPage(initialEntries = ["/app/analytics"]) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
  });
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <QueryClientProvider client={queryClient}>
        <AuthContext.Provider
          value={{
            apiClient: apiClientStub,
            user: { id: "u1", username: "demo", currency_code: "USD" },
            accessToken: "token",
            isAuthenticated: true,
            isBootstrapping: false,
            login: async () => undefined,
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
          income_total_cents: 10000,
          expense_total_cents: 200000,
          budget_spent_cents: 150000,
          budget_limit_cents: 250000
        },
        {
          category_id: "c-income",
          category_name: "Salary",
          income_total_cents: 350000,
          expense_total_cents: 0,
          budget_spent_cents: 0,
          budget_limit_cents: 0
        }
      ]
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

    fireEvent.click(screen.getByRole("button", { name: "Income categories" }));

    await waitFor(() => {
      names = screen.getAllByTestId("category-name");
      expect(names[0]).toHaveTextContent("Salary");
    });
  });

  it("shows inline validation for invalid local date range on apply", async () => {
    renderPage();
    await screen.findAllByTestId("category-name");

    fireEvent.change(screen.getByLabelText("From date"), { target: { value: "2026-03-31" } });
    fireEvent.change(screen.getByLabelText("To date"), { target: { value: "2026-03-01" } });
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
    expect(await screen.findByText("Unexpected error. Please retry.")).toBeInTheDocument();
  });

  it("shows no budget period copy when overlay is enabled and no limits exist", async () => {
    vi.mocked(getAnalyticsByMonth).mockResolvedValueOnce({
      items: [
        {
          month: "2026-02",
          income_total_cents: 500000,
          expense_total_cents: 300000,
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
    expect(await screen.findByText("Unexpected error. Please retry.")).toBeInTheDocument();
    expect(screen.queryByText("Invalid date range")).not.toBeInTheDocument();
  });
});
