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

function toIsoLocalDate(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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

  it("applies status filter and refetches goals with selected status", async () => {
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
    await screen.findByText("Emergency Fund");

    fireEvent.change(screen.getByLabelText("Savings status filter"), { target: { value: "completed" } });

    await waitFor(() => {
      expect(listSavingsGoals).toHaveBeenLastCalledWith(expect.anything(), { status: "completed" });
    });
  });

  it("renders due soon and overdue badges using local-device deadline rules", async () => {
    const now = new Date();
    const dueSoonDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 10);
    const overdueDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 2);
    vi.mocked(listSavingsGoals).mockResolvedValue({
      items: [
        {
          id: "goal_due_soon",
          name: "Trip",
          target_cents: 400000,
          account_id: "acc_1",
          category_id: "cat_1",
          deadline: toIsoLocalDate(dueSoonDate),
          note: null,
          status: "active",
          archived_at: null,
          created_at: "2026-03-01T00:00:00Z",
          updated_at: "2026-03-01T00:00:00Z",
          saved_cents: 100000,
          remaining_cents: 300000,
          progress_pct: 25.0
        },
        {
          id: "goal_overdue",
          name: "Laptop",
          target_cents: 200000,
          account_id: "acc_1",
          category_id: "cat_1",
          deadline: toIsoLocalDate(overdueDate),
          note: null,
          status: "active",
          archived_at: null,
          created_at: "2026-03-01T00:00:00Z",
          updated_at: "2026-03-01T00:00:00Z",
          saved_cents: 50000,
          remaining_cents: 150000,
          progress_pct: 25.0
        }
      ]
    });

    renderPage();

    expect(await screen.findByText("Trip")).toBeInTheDocument();
    expect(screen.getByText("Due soon")).toBeInTheDocument();
    expect(screen.getByText("Overdue")).toBeInTheDocument();
  });

  it("keeps page container protected against horizontal overflow", async () => {
    renderPage();
    expect(await screen.findByText("No savings goals yet - set your first goal.")).toBeInTheDocument();
    const pageContainer = screen.getByTestId("savings-page");
    expect(pageContainer).toHaveClass("overflow-x-hidden");
  });

  it("shows form problem feedback when deleting contribution fails", async () => {
    const deleteContributionError = new Error("delete failed");
    const deleteMutation = mutationStub();
    deleteMutation.mutateAsync = vi.fn().mockRejectedValue(deleteContributionError);
    vi.mocked(useDeleteSavingsContribution).mockReturnValue(deleteMutation as never);

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
      saved_cents: 150000,
      remaining_cents: 350000,
      progress_pct: 30.0,
      contributions: [
        {
          id: "contrib_1",
          goal_id: "goal_1",
          amount_cents: 5000,
          transaction_id: "tx_1",
          note: "seed",
          contributed_at: "2026-03-02T00:00:00Z"
        }
      ]
    });

    renderPage();
    await screen.findByText("Emergency Fund");

    fireEvent.click(screen.getByRole("button", { name: "Emergency Fund" }));
    await screen.findByRole("button", { name: "Delete" });

    fireEvent.click(screen.getByRole("button", { name: "Delete" }));

    await waitFor(() => expect(deleteMutation.mutateAsync).toHaveBeenCalled());
    expect(await screen.findByText("Unexpected error. Please retry.")).toBeInTheDocument();
  });
});
