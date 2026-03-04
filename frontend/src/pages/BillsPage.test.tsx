import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { listAccounts } from "@/api/accounts";
import { listBills } from "@/api/bills";
import { listCategories } from "@/api/categories";
import { AuthContext } from "@/auth/AuthContext";
import BillsPage from "@/pages/BillsPage";
import {
  useArchiveBill,
  useBillMonthlyStatus,
  useCreateBill,
  useMarkBillPaid,
  useUnmarkBillPaid,
  useUpdateBill
} from "@/features/analytics/analyticsQueries";

vi.mock("@/api/accounts", () => ({ listAccounts: vi.fn() }));
vi.mock("@/api/categories", () => ({ listCategories: vi.fn() }));
vi.mock("@/api/bills", async () => {
  const actual = await vi.importActual<typeof import("@/api/bills")>("@/api/bills");
  return { ...actual, listBills: vi.fn() };
});
vi.mock("@/features/analytics/analyticsQueries", async () => {
  const actual = await vi.importActual<typeof import("@/features/analytics/analyticsQueries")>(
    "@/features/analytics/analyticsQueries"
  );
  return {
    ...actual,
    useBillMonthlyStatus: vi.fn(),
    useCreateBill: vi.fn(),
    useUpdateBill: vi.fn(),
    useArchiveBill: vi.fn(),
    useMarkBillPaid: vi.fn(),
    useUnmarkBillPaid: vi.fn()
  };
});

function mutationStub() {
  return {
    mutateAsync: vi.fn().mockResolvedValue(undefined),
    isPending: false
  };
}

function renderPage(path = "/app/bills?month=2026-03") {
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
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route path="/app/bills" element={<BillsPage />} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>
    </QueryClientProvider>
  );
}

describe("BillsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(listAccounts).mockResolvedValue({ items: [], next_cursor: null });
    vi.mocked(listCategories).mockResolvedValue({ items: [], next_cursor: null });
    vi.mocked(listBills).mockResolvedValue({ items: [] });

    vi.mocked(useBillMonthlyStatus).mockReturnValue({
      data: {
        month: "2026-03",
        summary: {
          total_budget_cents: 0,
          total_paid_cents: 0,
          total_pending_cents: 0,
          paid_count: 0,
          pending_count: 0
        },
        items: []
      },
      error: null
    } as never);

    vi.mocked(useCreateBill).mockReturnValue(mutationStub() as never);
    vi.mocked(useUpdateBill).mockReturnValue(mutationStub() as never);
    vi.mocked(useArchiveBill).mockReturnValue(mutationStub() as never);
    vi.mocked(useMarkBillPaid).mockReturnValue(mutationStub() as never);
    vi.mocked(useUnmarkBillPaid).mockReturnValue(mutationStub() as never);
  });

  it("renders zero state with CTA when there are no bills", async () => {
    renderPage();

    expect(await screen.findByText("No bills yet — add your first recurring bill.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add first bill" })).toBeInTheDocument();
  });

  it("renders KPI cards and bill status rows", async () => {
    vi.mocked(listAccounts).mockResolvedValue({
      items: [{ id: "acc_1", name: "Main", type: "cash", initial_balance_cents: 0, archived_at: null }],
      next_cursor: null
    });
    vi.mocked(listCategories).mockResolvedValue({
      items: [{ id: "cat_1", name: "Utilities", type: "expense", archived_at: null }],
      next_cursor: null
    });
    vi.mocked(listBills).mockResolvedValue({
      items: [
        {
          id: "bill_1",
          name: "Electricity",
          due_day: 28,
          budget_cents: 200000,
          category_id: "cat_1",
          account_id: "acc_1",
          note: null,
          is_active: true,
          archived_at: null,
          created_at: "2026-03-01T00:00:00Z",
          updated_at: "2026-03-01T00:00:00Z"
        }
      ]
    });
    vi.mocked(useBillMonthlyStatus).mockReturnValue({
      data: {
        month: "2026-03",
        summary: {
          total_budget_cents: 200000,
          total_paid_cents: 87570,
          total_pending_cents: 112430,
          paid_count: 1,
          pending_count: 0
        },
        items: [
          {
            bill_id: "bill_1",
            name: "Electricity",
            due_day: 28,
            due_date: "2026-03-28",
            budget_cents: 200000,
            status: "paid",
            actual_cents: 87570,
            transaction_id: "tx_1",
            diff_cents: -112430
          }
        ]
      },
      error: null
    } as never);

    renderPage();

    await waitFor(() => expect(screen.getByText("Budgeted")).toBeInTheDocument());
    expect(screen.getAllByText("Paid").length).toBeGreaterThan(0);
    expect(screen.getByText("Pending")).toBeInTheDocument();
    expect(screen.getByText("Electricity")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Unmark" })).toBeInTheDocument();
  });

  it("opens mark-paid modal and submits payment", async () => {
    const markMutation = mutationStub();
    vi.mocked(useMarkBillPaid).mockReturnValue(markMutation as never);

    vi.mocked(listAccounts).mockResolvedValue({
      items: [{ id: "acc_1", name: "Main", type: "cash", initial_balance_cents: 0, archived_at: null }],
      next_cursor: null
    });
    vi.mocked(listCategories).mockResolvedValue({
      items: [{ id: "cat_1", name: "Utilities", type: "expense", archived_at: null }],
      next_cursor: null
    });
    vi.mocked(listBills).mockResolvedValue({
      items: [
        {
          id: "bill_1",
          name: "Electricity",
          due_day: 28,
          budget_cents: 200000,
          category_id: "cat_1",
          account_id: "acc_1",
          note: null,
          is_active: true,
          archived_at: null,
          created_at: "2026-03-01T00:00:00Z",
          updated_at: "2026-03-01T00:00:00Z"
        }
      ]
    });
    vi.mocked(useBillMonthlyStatus).mockReturnValue({
      data: {
        month: "2026-03",
        summary: {
          total_budget_cents: 200000,
          total_paid_cents: 0,
          total_pending_cents: 200000,
          paid_count: 0,
          pending_count: 1
        },
        items: [
          {
            bill_id: "bill_1",
            name: "Electricity",
            due_day: 28,
            due_date: "2026-03-28",
            budget_cents: 200000,
            status: "pending",
            actual_cents: null,
            transaction_id: null,
            diff_cents: null
          }
        ]
      },
      error: null
    } as never);

    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "Mark as paid" }));
    expect(screen.getByText("Editing amount? Unmark and re-pay with the correct value.")).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText("0"), { target: { value: "87570" } });
    fireEvent.click(screen.getByRole("button", { name: "Mark paid" }));

    await waitFor(() => {
      expect(markMutation.mutateAsync).toHaveBeenCalledWith({
        billId: "bill_1",
        payload: { month: "2026-03", actual_cents: 87570 }
      });
    });
  });

  it("opens create modal, validates due_day, and submits create payload", async () => {
    const createMutation = mutationStub();
    vi.mocked(useCreateBill).mockReturnValue(createMutation as never);

    vi.mocked(listAccounts).mockResolvedValue({
      items: [{ id: "acc_1", name: "Main", type: "cash", initial_balance_cents: 0, archived_at: null }],
      next_cursor: null
    });
    vi.mocked(listCategories).mockResolvedValue({
      items: [{ id: "cat_1", name: "Utilities", type: "expense", archived_at: null }],
      next_cursor: null
    });
    vi.mocked(listBills).mockResolvedValue({ items: [] });

    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "Add bill" }));
    fireEvent.click(screen.getByRole("button", { name: "Create bill" }));
    expect(await screen.findByText("Due day must be between 1 and 28.")).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText("Electricity"), { target: { value: "Electricity" } });
    fireEvent.change(screen.getByPlaceholderText("28"), { target: { value: "28" } });
    fireEvent.change(screen.getByPlaceholderText("200000"), { target: { value: "200000" } });
    fireEvent.change(screen.getByLabelText("Bill account"), { target: { value: "acc_1" } });
    fireEvent.change(screen.getByLabelText("Bill category"), { target: { value: "cat_1" } });
    fireEvent.click(screen.getByRole("button", { name: "Create bill" }));

    await waitFor(() => {
      expect(createMutation.mutateAsync).toHaveBeenCalledWith({
        name: "Electricity",
        due_day: 28,
        budget_cents: 200000,
        account_id: "acc_1",
        category_id: "cat_1",
        note: null,
        is_active: true
      });
    });
  });

  it("renders inactive section and can edit + archive bill", async () => {
    const updateMutation = mutationStub();
    const archiveMutation = mutationStub();
    vi.mocked(useUpdateBill).mockReturnValue(updateMutation as never);
    vi.mocked(useArchiveBill).mockReturnValue(archiveMutation as never);

    vi.mocked(listAccounts).mockResolvedValue({
      items: [{ id: "acc_1", name: "Main", type: "cash", initial_balance_cents: 0, archived_at: null }],
      next_cursor: null
    });
    vi.mocked(listCategories).mockResolvedValue({
      items: [{ id: "cat_1", name: "Utilities", type: "expense", archived_at: null }],
      next_cursor: null
    });
    vi.mocked(listBills).mockResolvedValue({
      items: [
        {
          id: "bill_inactive",
          name: "Paused Service",
          due_day: 15,
          budget_cents: 10000,
          category_id: "cat_1",
          account_id: "acc_1",
          note: null,
          is_active: false,
          archived_at: null,
          created_at: "2026-03-01T00:00:00Z",
          updated_at: "2026-03-01T00:00:00Z"
        },
        {
          id: "bill_active",
          name: "Active Service",
          due_day: 10,
          budget_cents: 9000,
          category_id: "cat_1",
          account_id: "acc_1",
          note: null,
          is_active: true,
          archived_at: null,
          created_at: "2026-03-01T00:00:00Z",
          updated_at: "2026-03-01T00:00:00Z"
        }
      ]
    });
    vi.mocked(useBillMonthlyStatus).mockReturnValue({
      data: {
        month: "2026-03",
        summary: {
          total_budget_cents: 9000,
          total_paid_cents: 0,
          total_pending_cents: 9000,
          paid_count: 0,
          pending_count: 1
        },
        items: [
          {
            bill_id: "bill_active",
            name: "Active Service",
            due_day: 10,
            due_date: "2026-03-10",
            budget_cents: 9000,
            status: "pending",
            actual_cents: null,
            transaction_id: null,
            diff_cents: null
          }
        ]
      },
      error: null
    } as never);

    renderPage();

    expect(await screen.findByText("Inactive bills")).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole("button", { name: "Edit" })[0]);
    fireEvent.change(screen.getByPlaceholderText("Electricity"), { target: { value: "Paused Service Updated" } });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => {
      expect(updateMutation.mutateAsync).toHaveBeenCalled();
    });

    fireEvent.click(screen.getByRole("button", { name: "Archive" }));
    await waitFor(() => {
      expect(archiveMutation.mutateAsync).toHaveBeenCalledWith("bill_active");
    });
  });

  it("unmarks paid bill using month from URL", async () => {
    const unmarkMutation = mutationStub();
    vi.mocked(useUnmarkBillPaid).mockReturnValue(unmarkMutation as never);
    vi.mocked(listAccounts).mockResolvedValue({ items: [], next_cursor: null });
    vi.mocked(listCategories).mockResolvedValue({ items: [], next_cursor: null });
    vi.mocked(listBills).mockResolvedValue({
      items: [
        {
          id: "bill_paid",
          name: "Water",
          due_day: 12,
          budget_cents: 5000,
          category_id: "cat_1",
          account_id: "acc_1",
          note: null,
          is_active: true,
          archived_at: null,
          created_at: "2026-03-01T00:00:00Z",
          updated_at: "2026-03-01T00:00:00Z"
        }
      ]
    });
    vi.mocked(useBillMonthlyStatus).mockReturnValue({
      data: {
        month: "2026-03",
        summary: {
          total_budget_cents: 5000,
          total_paid_cents: 5000,
          total_pending_cents: 0,
          paid_count: 1,
          pending_count: 0
        },
        items: [
          {
            bill_id: "bill_paid",
            name: "Water",
            due_day: 12,
            due_date: "2026-03-12",
            budget_cents: 5000,
            status: "paid",
            actual_cents: 5000,
            transaction_id: "tx_1",
            diff_cents: 0
          }
        ]
      },
      error: null
    } as never);

    renderPage("/app/bills?month=2026-03");

    fireEvent.click(await screen.findByRole("button", { name: "Unmark" }));
    await waitFor(() => {
      expect(unmarkMutation.mutateAsync).toHaveBeenCalledWith({ billId: "bill_paid", month: "2026-03" });
    });
  });

  it("closes mark-paid modal via cancel action", async () => {
    vi.mocked(listAccounts).mockResolvedValue({ items: [], next_cursor: null });
    vi.mocked(listCategories).mockResolvedValue({ items: [], next_cursor: null });
    vi.mocked(listBills).mockResolvedValue({
      items: [
        {
          id: "bill_pending",
          name: "Phone",
          due_day: 5,
          budget_cents: 3000,
          category_id: "cat_1",
          account_id: "acc_1",
          note: null,
          is_active: true,
          archived_at: null,
          created_at: "2026-03-01T00:00:00Z",
          updated_at: "2026-03-01T00:00:00Z"
        }
      ]
    });
    vi.mocked(useBillMonthlyStatus).mockReturnValue({
      data: {
        month: "2026-03",
        summary: {
          total_budget_cents: 3000,
          total_paid_cents: 0,
          total_pending_cents: 3000,
          paid_count: 0,
          pending_count: 1
        },
        items: [
          {
            bill_id: "bill_pending",
            name: "Phone",
            due_day: 5,
            due_date: "2026-03-05",
            budget_cents: 3000,
            status: "pending",
            actual_cents: null,
            transaction_id: null,
            diff_cents: null
          }
        ]
      },
      error: null
    } as never);

    renderPage("/app/bills?month=2026-03");
    fireEvent.click(await screen.findByRole("button", { name: "Mark as paid" }));
    expect(screen.getByRole("button", { name: "Mark paid" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    await waitFor(() => {
      expect(screen.queryByRole("button", { name: "Mark paid" })).not.toBeInTheDocument();
    });
  });
});
