import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";

import type { ApiClient } from "@/api/client";
import { listAccounts } from "@/api/accounts";
import { listCategories } from "@/api/categories";
import { createTransaction } from "@/api/transactions";
import { AuthContext } from "@/auth/AuthContext";
import DashboardPage from "@/features/dashboard/DashboardPage";
import * as dashboardQueries from "@/features/dashboard/queries";

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
vi.mock("@/api/transactions", () => ({ createTransaction: vi.fn() }));

const apiClientStub = {} as ApiClient;

function renderPage(width = 390) {
  Object.defineProperty(window, "innerWidth", {
    configurable: true,
    writable: true,
    value: width
  });
  window.dispatchEvent(new Event("resize"));

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
  });

  return render(
    <MemoryRouter initialEntries={["/app/dashboard"]}>
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
          <DashboardPage />
        </AuthContext.Provider>
      </QueryClientProvider>
    </MemoryRouter>
  );
}

function mockDashboardQueries() {
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
      {
        id: "t1",
        type: "expense",
        account_id: "a1",
        category_id: "c1",
        amount_cents: 12000,
        date: "2026-02-01",
        merchant: "A",
        note: null,
        archived_at: null,
        created_at: "",
        updated_at: ""
      }
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
}

describe("DashboardPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
    mockDashboardQueries();
  });

  it("supports quick decisions on mobile with visible health and prioritized guidance", () => {
    renderPage(390);

    expect(screen.getByRole("heading", { name: "Dashboard" })).toBeInTheDocument();
    expect(screen.queryByText("Quick action")).not.toBeInTheDocument();
    expect(screen.getByText("Budget pace monitor")).toBeInTheDocument();
    expect(screen.getByText("Executive health score")).toBeInTheDocument();
    expect(screen.getByText("Risk alerts")).toBeInTheDocument();
  });

  it("keeps KPI groups and action links readable on desktop composition", () => {
    renderPage(1280);

    expect(screen.getByRole("heading", { name: "Income" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Expense" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Net" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Budget progress" })).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Open transactions" }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: "Review budgets" }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: "Open analytics" }).length).toBeGreaterThan(0);
  });

  it("renders pace monitor details with projected vs actual usage", () => {
    renderPage(1280);

    expect(screen.getByText("Projected month usage")).toBeInTheDocument();
    expect(screen.getByText("Actual budget usage")).toBeInTheDocument();
    expect(screen.getByText("Pace signal")).toBeInTheDocument();
  });
});
