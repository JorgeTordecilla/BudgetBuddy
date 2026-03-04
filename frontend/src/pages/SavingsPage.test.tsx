import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { listAccounts } from "@/api/accounts";
import { listCategories } from "@/api/categories";
import { getSavingsGoal, listSavingsGoals } from "@/api/savings";
import { AuthContext } from "@/auth/AuthContext";
import SavingsPage from "@/pages/SavingsPage";
import {
  useArchiveSavingsGoal,
  useCancelSavingsGoal,
  useCompleteSavingsGoal,
  useCreateSavingsContribution,
  useCreateSavingsGoal,
  useDeleteSavingsContribution,
  useSavingsSummary,
  useUpdateSavingsGoal
} from "@/features/analytics/analyticsQueries";

vi.mock("@/api/accounts", () => ({ listAccounts: vi.fn() }));
vi.mock("@/api/categories", () => ({ listCategories: vi.fn() }));
vi.mock("@/api/savings", async () => {
  const actual = await vi.importActual<typeof import("@/api/savings")>("@/api/savings");
  return { ...actual, listSavingsGoals: vi.fn(), getSavingsGoal: vi.fn() };
});
vi.mock("@/features/analytics/analyticsQueries", async () => {
  const actual = await vi.importActual<typeof import("@/features/analytics/analyticsQueries")>(
    "@/features/analytics/analyticsQueries"
  );
  return {
    ...actual,
    useSavingsSummary: vi.fn(),
    useCreateSavingsGoal: vi.fn(),
    useUpdateSavingsGoal: vi.fn(),
    useArchiveSavingsGoal: vi.fn(),
    useCompleteSavingsGoal: vi.fn(),
    useCancelSavingsGoal: vi.fn(),
    useCreateSavingsContribution: vi.fn(),
    useDeleteSavingsContribution: vi.fn()
  };
});

function mutationStub() {
  return {
    mutateAsync: vi.fn().mockResolvedValue(undefined),
    isPending: false
  };
}

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider
        value={{
          apiClient: {} as never,
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
        <MemoryRouter initialEntries={["/app/savings"]}>
          <Routes>
            <Route path="/app/savings" element={<SavingsPage />} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>
    </QueryClientProvider>
  );
}

describe("SavingsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(listAccounts).mockResolvedValue({ items: [], next_cursor: null });
    vi.mocked(listCategories).mockResolvedValue({ items: [], next_cursor: null });
    vi.mocked(listSavingsGoals).mockResolvedValue({ items: [] });
    vi.mocked(getSavingsGoal).mockResolvedValue({
      id: "goal_1",
      name: "Emergency Fund",
      target_cents: 500000,
      account_id: "acc_1",
      category_id: "cat_1",
      deadline: "2026-12-31",
      note: null,
      status: "active",
      archived_at: null,
      created_at: "2026-03-01T00:00:00Z",
      updated_at: "2026-03-01T00:00:00Z",
      saved_cents: 0,
      remaining_cents: 500000,
      progress_pct: 0,
      contributions: []
    });

    vi.mocked(useSavingsSummary).mockReturnValue({
      data: {
        active_count: 0,
        completed_count: 0,
        total_target_cents: 0,
        total_saved_cents: 0,
        total_remaining_cents: 0,
        overall_progress_pct: 0
      },
      error: null
    } as never);

    vi.mocked(useCreateSavingsGoal).mockReturnValue(mutationStub() as never);
    vi.mocked(useUpdateSavingsGoal).mockReturnValue(mutationStub() as never);
    vi.mocked(useArchiveSavingsGoal).mockReturnValue(mutationStub() as never);
    vi.mocked(useCompleteSavingsGoal).mockReturnValue(mutationStub() as never);
    vi.mocked(useCancelSavingsGoal).mockReturnValue(mutationStub() as never);
    vi.mocked(useCreateSavingsContribution).mockReturnValue(mutationStub() as never);
    vi.mocked(useDeleteSavingsContribution).mockReturnValue(mutationStub() as never);
  });

  it("renders zero state and CTA", async () => {
    renderPage();

    expect(await screen.findByText("No savings goals yet - set your first goal.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create goal" })).toBeInTheDocument();
  });

  it("renders list and opens contribution modal for active goal", async () => {
    vi.mocked(listSavingsGoals).mockResolvedValue({
      items: [
        {
          id: "goal_1",
          name: "Emergency Fund",
          target_cents: 500000,
          account_id: "acc_1",
          category_id: "cat_1",
          deadline: "2026-12-31",
          note: null,
          status: "active",
          archived_at: null,
          created_at: "2026-03-01T00:00:00Z",
          updated_at: "2026-03-01T00:00:00Z",
          saved_cents: 150000,
          remaining_cents: 350000,
          progress_pct: 30.0
        }
      ]
    });

    renderPage();

    expect(await screen.findByText("Emergency Fund")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Add contribution" }));
    await waitFor(() => expect(screen.getByText("Add contribution: Emergency Fund")).toBeInTheDocument());
  });
});
