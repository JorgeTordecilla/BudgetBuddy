import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ApiClient } from "@/api/client";
import { archiveBudget, createBudget, listBudgets, updateBudget } from "@/api/budgets";
import { listCategories } from "@/api/categories";
import { ApiProblemError } from "@/api/problem";
import { AuthContext } from "@/auth/AuthContext";
import BudgetsPage from "@/features/budgets/BudgetsPage";

vi.mock("@/api/budgets", () => ({
  listBudgets: vi.fn(),
  createBudget: vi.fn(),
  updateBudget: vi.fn(),
  archiveBudget: vi.fn()
}));

vi.mock("@/api/categories", () => ({
  listCategories: vi.fn()
}));

const apiClientStub = {} as ApiClient;

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
  });
  return render(
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
        <BudgetsPage />
      </AuthContext.Provider>
    </QueryClientProvider>
  );
}

describe("BudgetsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(listBudgets).mockResolvedValue({
      items: [
        {
          id: "b1",
          month: "2026-02",
          category_id: "c1",
          limit_cents: 120000,
          archived_at: null,
          created_at: "2026-02-01T00:00:00Z",
          updated_at: "2026-02-01T00:00:00Z"
        },
        {
          id: "b2",
          month: "2026-03",
          category_id: "c2",
          limit_cents: 10000,
          archived_at: null,
          created_at: "2026-03-01T00:00:00Z",
          updated_at: "2026-03-01T00:00:00Z"
        }
      ]
    });
    vi.mocked(listCategories).mockResolvedValue({
      items: [
        { id: "c1", name: "Food", type: "expense", note: null, archived_at: null },
        { id: "c2", name: "Salary", type: "income", note: null, archived_at: null }
      ],
      next_cursor: null
    });
    vi.mocked(createBudget).mockResolvedValue({
      id: "b3",
      month: "2026-04",
      category_id: "c2",
      limit_cents: 10000,
      archived_at: null,
      created_at: "2026-04-01T00:00:00Z",
      updated_at: "2026-04-01T00:00:00Z"
    });
    vi.mocked(updateBudget).mockResolvedValue({
      id: "b1",
      month: "2026-02",
      category_id: "c1",
      limit_cents: 120000,
      archived_at: null,
      created_at: "2026-02-01T00:00:00Z",
      updated_at: "2026-02-02T00:00:00Z"
    });
    vi.mocked(archiveBudget).mockResolvedValue();
  });

  it("shows income and expense categories and converts limit to cents on create", async () => {
    renderPage();
    await screen.findByText("2026-03");

    fireEvent.click(screen.getByRole("button", { name: "New budget" }));

    const dialog = screen.getByRole("dialog");
    const categorySelect = within(dialog).getByLabelText("Category");
    expect(within(dialog).getByRole("option", { name: "Food (expense)" })).toBeInTheDocument();
    expect(within(dialog).getByRole("option", { name: "Salary (income)" })).toBeInTheDocument();

    fireEvent.change(categorySelect, { target: { value: "c2" } });
    fireEvent.change(within(dialog).getByLabelText("Limit"), { target: { value: "100.50" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Create budget" }));

    await waitFor(() =>
      expect(createBudget).toHaveBeenCalledWith(
        apiClientStub,
        expect.objectContaining({
          category_id: "c2",
          limit_cents: 10050
        })
      )
    );
  });

  it("applies range only when clicking Apply", async () => {
    renderPage();
    await screen.findByText("2026-03");

    expect(listBudgets).toHaveBeenCalledTimes(1);

    fireEvent.change(screen.getByLabelText("From month"), { target: { value: "2026-01" } });
    fireEvent.change(screen.getByLabelText("To month"), { target: { value: "2026-04" } });

    await waitFor(() => expect(listBudgets).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByRole("button", { name: "Apply" }));

    await waitFor(() => expect(listBudgets).toHaveBeenCalledTimes(2));
    expect(listBudgets).toHaveBeenLastCalledWith(apiClientStub, { from: "2026-01", to: "2026-04" });
  });

  it("sorts budgets by month descending", async () => {
    renderPage();
    await screen.findByText("2026-03");

    const rows = screen.getAllByRole("row");
    const firstBodyRow = rows[1];
    expect(within(firstBodyRow).getByText("2026-03")).toBeInTheDocument();
  });

  it("shows validation feedback for invalid month range", async () => {
    renderPage();
    await screen.findByText("2026-03");

    fireEvent.change(screen.getByLabelText("From month"), { target: { value: "2026-05" } });
    fireEvent.change(screen.getByLabelText("To month"), { target: { value: "2026-01" } });
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));

    expect(await screen.findByText("Unexpected error. Please retry.")).toBeInTheDocument();
  });

  it("renders mapped 409 budget-duplicate feedback", async () => {
    vi.mocked(createBudget).mockRejectedValueOnce(
      new ApiProblemError(409, {
        type: "https://api.budgetbuddy.dev/problems/budget-duplicate",
        title: "Budget already exists",
        status: 409
      })
    );

    renderPage();
    await screen.findByText("2026-03");
    fireEvent.click(screen.getByRole("button", { name: "New budget" }));

    const dialog = screen.getByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText("Category"), { target: { value: "c1" } });
    fireEvent.change(within(dialog).getByLabelText("Limit"), { target: { value: "100" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Create budget" }));

    expect(await screen.findByText("A budget for this category and month already exists.")).toBeInTheDocument();
  });

  it("renders inline feedback for backend budget-month-invalid", async () => {
    vi.mocked(createBudget).mockRejectedValueOnce(
      new ApiProblemError(400, {
        type: "https://api.budgetbuddy.dev/problems/budget-month-invalid",
        title: "",
        status: 400
      })
    );

    renderPage();
    await screen.findByText("2026-03");
    fireEvent.click(screen.getByRole("button", { name: "New budget" }));

    const dialog = screen.getByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText("Category"), { target: { value: "c1" } });
    fireEvent.change(within(dialog).getByLabelText("Limit"), { target: { value: "100" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Create budget" }));

    await waitFor(() => {
      expect(screen.getAllByText("Month must use YYYY-MM format.").length).toBeGreaterThan(0);
    });
  });

  it("renders inline feedback for backend money-amount-* errors", async () => {
    vi.mocked(createBudget).mockRejectedValueOnce(
      new ApiProblemError(400, {
        type: "https://api.budgetbuddy.dev/problems/money-amount-out-of-range",
        title: "",
        status: 400
      })
    );

    renderPage();
    await screen.findByText("2026-03");
    fireEvent.click(screen.getByRole("button", { name: "New budget" }));

    const dialog = screen.getByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText("Category"), { target: { value: "c1" } });
    fireEvent.change(within(dialog).getByLabelText("Limit"), { target: { value: "100" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Create budget" }));

    await waitFor(() => {
      expect(screen.getAllByText("Limit must be a positive amount with up to two decimals.").length).toBeGreaterThan(0);
    });
  });

  it("shows month validation on create when month format is invalid", async () => {
    renderPage();
    await screen.findByText("2026-03");
    fireEvent.click(screen.getByRole("button", { name: "New budget" }));

    const dialog = screen.getByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText("Month"), { target: { value: "2026/02" } });
    fireEvent.change(within(dialog).getByLabelText("Category"), { target: { value: "c1" } });
    fireEvent.change(within(dialog).getByLabelText("Limit"), { target: { value: "100" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Create budget" }));

    expect(await screen.findByText("Unexpected error. Please retry.")).toBeInTheDocument();
    expect(screen.getAllByText("Month must use YYYY-MM format.").length).toBeGreaterThan(0);
    expect(createBudget).not.toHaveBeenCalled();
  });

  it("shows limit validation on create when amount is invalid", async () => {
    renderPage();
    await screen.findByText("2026-03");
    fireEvent.click(screen.getByRole("button", { name: "New budget" }));

    const dialog = screen.getByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText("Category"), { target: { value: "c1" } });
    fireEvent.change(within(dialog).getByLabelText("Limit"), { target: { value: "0" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Create budget" }));

    expect(await screen.findByText("Unexpected error. Please retry.")).toBeInTheDocument();
    expect(screen.getAllByText("Limit must be a positive amount with up to two decimals.").length).toBeGreaterThan(0);
    expect(createBudget).not.toHaveBeenCalled();
  });

  it("edits budget and submits partial update payload", async () => {
    renderPage();
    await screen.findByText("2026-03");

    fireEvent.click(screen.getAllByRole("button", { name: "Edit" })[0]!);
    const dialog = screen.getByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText("Limit"), { target: { value: "300.00" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Save changes" }));

    await waitFor(() =>
      expect(updateBudget).toHaveBeenCalledWith(apiClientStub, expect.any(String), expect.objectContaining({ limit_cents: 30000 }))
    );
  });

  it("blocks update when there are no changes", async () => {
    renderPage();
    await screen.findByText("2026-03");

    fireEvent.click(screen.getAllByRole("button", { name: "Edit" })[0]!);
    const dialog = screen.getByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Save changes" }));

    expect(await screen.findByText("Unexpected error. Please retry.")).toBeInTheDocument();
    expect(updateBudget).not.toHaveBeenCalled();
  });

  it("shows archive error banner when delete fails", async () => {
    vi.mocked(archiveBudget).mockRejectedValueOnce(
      new ApiProblemError(403, {
        type: "https://api.budgetbuddy.dev/problems/forbidden",
        title: "Forbidden",
        status: 403
      })
    );

    renderPage();
    await screen.findByText("2026-03");
    fireEvent.click(screen.getAllByRole("button", { name: "Archive" })[0]!);

    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Archive" }));

    expect(await screen.findByText("You do not have access to this resource.")).toBeInTheDocument();
  });

  it("archives budget through confirm dialog", async () => {
    renderPage();
    await screen.findByText("2026-03");

    fireEvent.click(screen.getAllByRole("button", { name: "Archive" })[0]!);
    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Archive" }));

    await waitFor(() => expect(archiveBudget).toHaveBeenCalled());
  });

  it("shows fallback page error when list fails unexpectedly", async () => {
    vi.mocked(listBudgets).mockRejectedValueOnce(new Error("boom"));
    renderPage();
    expect(await screen.findByText("Unexpected error. Please retry.")).toBeInTheDocument();
  });
});
