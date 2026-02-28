import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";
import { fireEvent, waitFor, within } from "@testing-library/react";

import type { ApiClient } from "@/api/client";
import { AuthContext } from "@/auth/AuthContext";
import Dashboard from "@/routes/Dashboard";
import * as dashboardQueries from "@/features/dashboard/queries";
import { listAccounts } from "@/api/accounts";
import { listCategories } from "@/api/categories";
import { createTransaction } from "@/api/transactions";

vi.mock("@/features/dashboard/queries", async () => {
  const actual = await vi.importActual<typeof import("@/features/dashboard/queries")>("@/features/dashboard/queries");
  return {
    ...actual,
    useDashboardMonthSummary: vi.fn(),
    useDashboardCategorySummary: vi.fn(),
    useDashboardExpenseSample: vi.fn(),
    useDashboardTrend: vi.fn()
  };
});
vi.mock("@/api/accounts", () => ({ listAccounts: vi.fn() }));
vi.mock("@/api/categories", () => ({ listCategories: vi.fn() }));
vi.mock("@/api/transactions", () => ({
  createTransaction: vi.fn()
}));

const apiClientStub = {} as ApiClient;

function renderDashboard() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
  });

  return render(
    <MemoryRouter>
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
          <Dashboard />
        </AuthContext.Provider>
      </QueryClientProvider>
    </MemoryRouter>
  );
}

describe("Dashboard", () => {
  it("renders cockpit KPIs and alerts", () => {
    vi.mocked(listAccounts).mockResolvedValue({ items: [], next_cursor: null });
    vi.mocked(listCategories).mockResolvedValue({ items: [], next_cursor: null });
    vi.mocked(createTransaction).mockResolvedValue({
      id: "t1",
      type: "expense",
      account_id: "a1",
      category_id: "c1",
      amount_cents: 1000,
      date: "2026-02-01",
      merchant: null,
      note: null,
      archived_at: null,
      created_at: "",
      updated_at: ""
    });
    vi.mocked(dashboardQueries.useDashboardMonthSummary).mockReturnValue({
      data: {
        month: "2026-02",
        income_total_cents: 500000,
        expense_total_cents: 300000,
        budget_spent_cents: 250000,
        budget_limit_cents: 350000
      },
      isLoading: false,
      error: null,
      refetch: vi.fn()
    } as never);
    vi.mocked(dashboardQueries.useDashboardCategorySummary).mockReturnValue({
      data: [
        {
          category_id: "c1",
          category_name: "Food",
          income_total_cents: 0,
          expense_total_cents: 200000,
          budget_spent_cents: 160000,
          budget_limit_cents: 120000
        }
      ],
      isLoading: false,
      error: null,
      refetch: vi.fn()
    } as never);
    vi.mocked(dashboardQueries.useDashboardExpenseSample).mockReturnValue({
      data: [
        { id: "t1", type: "expense", account_id: "a1", category_id: "c1", amount_cents: 12000, date: "2026-02-01", merchant: "A", note: null, archived_at: null, created_at: "", updated_at: "" },
        { id: "t2", type: "expense", account_id: "a1", category_id: "c1", amount_cents: 13000, date: "2026-02-02", merchant: "B", note: null, archived_at: null, created_at: "", updated_at: "" },
        { id: "t3", type: "expense", account_id: "a1", category_id: "c1", amount_cents: 14000, date: "2026-02-03", merchant: "C", note: null, archived_at: null, created_at: "", updated_at: "" },
        { id: "t4", type: "expense", account_id: "a1", category_id: "c1", amount_cents: 15000, date: "2026-02-04", merchant: "D", note: null, archived_at: null, created_at: "", updated_at: "" },
        { id: "t5", type: "expense", account_id: "a1", category_id: "c1", amount_cents: 16000, date: "2026-02-05", merchant: "E", note: null, archived_at: null, created_at: "", updated_at: "" },
        { id: "t6", type: "expense", account_id: "a1", category_id: "c1", amount_cents: 17000, date: "2026-02-06", merchant: "F", note: null, archived_at: null, created_at: "", updated_at: "" },
        { id: "t7", type: "expense", account_id: "a1", category_id: "c1", amount_cents: 18000, date: "2026-02-07", merchant: "G", note: null, archived_at: null, created_at: "", updated_at: "" },
        { id: "t8", type: "expense", account_id: "a1", category_id: "c1", amount_cents: 19000, date: "2026-02-08", merchant: "H", note: null, archived_at: null, created_at: "", updated_at: "" },
        { id: "t9", type: "expense", account_id: "a1", category_id: "c1", amount_cents: 80000, date: "2026-02-09", merchant: "Mega", note: null, archived_at: null, created_at: "", updated_at: "" }
      ],
      isLoading: false,
      error: null,
      refetch: vi.fn()
    } as never);
    vi.mocked(dashboardQueries.useDashboardTrend).mockReturnValue({
      data: [
        { month: "2026-01", income_total_cents: 300000, expense_total_cents: 200000, budget_spent_cents: 0, budget_limit_cents: 0 },
        { month: "2026-02", income_total_cents: 500000, expense_total_cents: 300000, budget_spent_cents: 0, budget_limit_cents: 0 }
      ],
      isLoading: false,
      error: null,
      refetch: vi.fn()
    } as never);

    renderDashboard();

    expect(screen.getByRole("heading", { name: "Dashboard" })).toBeInTheDocument();
    expect(screen.getByText("Over-budget categories")).toBeInTheDocument();
    expect(screen.getAllByText("Food").length).toBeGreaterThan(0);
    expect(screen.getByText("Spending spikes")).toBeInTheDocument();
    expect(screen.getByText("Mega")).toBeInTheDocument();
    expect(screen.getByText("Executive health score")).toBeInTheDocument();
  });

  it("renders loading and empty-state copy", () => {
    vi.mocked(listAccounts).mockResolvedValue({ items: [], next_cursor: null });
    vi.mocked(listCategories).mockResolvedValue({ items: [], next_cursor: null });
    vi.mocked(createTransaction).mockResolvedValue({
      id: "t1",
      type: "expense",
      account_id: "a1",
      category_id: "c1",
      amount_cents: 1000,
      date: "2026-02-01",
      merchant: null,
      note: null,
      archived_at: null,
      created_at: "",
      updated_at: ""
    });
    vi.mocked(dashboardQueries.useDashboardMonthSummary).mockReturnValue({
      data: null,
      isLoading: true,
      error: null,
      refetch: vi.fn()
    } as never);
    vi.mocked(dashboardQueries.useDashboardCategorySummary).mockReturnValue({
      data: [],
      isLoading: true,
      error: null,
      refetch: vi.fn()
    } as never);
    vi.mocked(dashboardQueries.useDashboardExpenseSample).mockReturnValue({
      data: [],
      isLoading: true,
      error: null,
      refetch: vi.fn()
    } as never);
    vi.mocked(dashboardQueries.useDashboardTrend).mockReturnValue({
      data: [],
      isLoading: true,
      error: null,
      refetch: vi.fn()
    } as never);

    renderDashboard();
    expect(screen.getAllByText("Loading...").length).toBeGreaterThan(0);
    expect(screen.getByText("Loading alerts...")).toBeInTheDocument();
  });

  it("renders ProblemDetails inline on query failure", () => {
    vi.mocked(listAccounts).mockResolvedValue({ items: [], next_cursor: null });
    vi.mocked(listCategories).mockResolvedValue({ items: [], next_cursor: null });
    vi.mocked(createTransaction).mockResolvedValue({
      id: "t1",
      type: "expense",
      account_id: "a1",
      category_id: "c1",
      amount_cents: 1000,
      date: "2026-02-01",
      merchant: null,
      note: null,
      archived_at: null,
      created_at: "",
      updated_at: ""
    });
    vi.mocked(dashboardQueries.useDashboardMonthSummary).mockReturnValue({
      data: null,
      isLoading: false,
      error: new Error("boom"),
      refetch: vi.fn()
    } as never);
    vi.mocked(dashboardQueries.useDashboardCategorySummary).mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
      refetch: vi.fn()
    } as never);
    vi.mocked(dashboardQueries.useDashboardExpenseSample).mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
      refetch: vi.fn()
    } as never);
    vi.mocked(dashboardQueries.useDashboardTrend).mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
      refetch: vi.fn()
    } as never);

    renderDashboard();
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("executes quick transaction flow from timeline", async () => {
    vi.mocked(listAccounts).mockResolvedValue({
      items: [{ id: "a1", name: "Wallet", type: "cash", initial_balance_cents: 0, note: null, archived_at: null }],
      next_cursor: null
    });
    vi.mocked(listCategories).mockResolvedValue({
      items: [{ id: "c1", name: "Food", type: "expense", note: null, archived_at: null }],
      next_cursor: null
    });
    vi.mocked(createTransaction).mockResolvedValue({
      id: "t1",
      type: "expense",
      account_id: "a1",
      category_id: "c1",
      amount_cents: 2500,
      date: "2026-02-15",
      merchant: null,
      note: null,
      archived_at: null,
      created_at: "",
      updated_at: ""
    });
    vi.mocked(dashboardQueries.useDashboardMonthSummary).mockReturnValue({
      data: {
        month: "2026-02",
        income_total_cents: 500000,
        expense_total_cents: 300000,
        budget_spent_cents: 250000,
        budget_limit_cents: 350000
      },
      isLoading: false,
      error: null,
      refetch: vi.fn()
    } as never);
    vi.mocked(dashboardQueries.useDashboardCategorySummary).mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
      refetch: vi.fn()
    } as never);
    vi.mocked(dashboardQueries.useDashboardExpenseSample).mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
      refetch: vi.fn()
    } as never);
    vi.mocked(dashboardQueries.useDashboardTrend).mockReturnValue({
      data: [{ month: "2026-02", income_total_cents: 500000, expense_total_cents: 300000, budget_spent_cents: 0, budget_limit_cents: 0 }],
      isLoading: false,
      error: null,
      refetch: vi.fn()
    } as never);

    renderDashboard();

    fireEvent.click(screen.getByRole("button", { name: "Add transaction" }));
    const dialog = screen.getByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });
});


