import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ApiClient } from "@/api/client";
import { listAccounts } from "@/api/accounts";
import { listCategories } from "@/api/categories";
import { listIncomeSources } from "@/api/incomeSources";
import { ApiProblemError } from "@/api/problem";
import {
  archiveTransaction,
  createTransaction,
  exportTransactionsCsv,
  listTransactions,
  restoreTransaction,
  updateTransaction
} from "@/api/transactions";
import { AuthContext } from "@/auth/AuthContext";
import TransactionsPage from "@/pages/TransactionsPage";
import * as downloadUtils from "@/utils/download";

vi.mock("@/api/accounts", () => ({
  listAccounts: vi.fn()
}));

vi.mock("@/api/categories", () => ({
  listCategories: vi.fn()
}));

vi.mock("@/api/incomeSources", () => ({
  listIncomeSources: vi.fn()
}));

vi.mock("@/api/transactions", () => ({
  listTransactions: vi.fn(),
  createTransaction: vi.fn(),
  updateTransaction: vi.fn(),
  archiveTransaction: vi.fn(),
  restoreTransaction: vi.fn(),
  exportTransactionsCsv: vi.fn()
}));

const apiClientStub = {} as ApiClient;

function renderPage(initialEntries = ["/app/transactions"]) {
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
            register: async () => undefined,
            logout: async () => undefined,
            bootstrapSession: async () => true
          }}
        >
          <Routes>
            <Route path="/app/transactions" element={<TransactionsPage />} />
            <Route path="/app/transactions/import" element={<div>Import page</div>} />
          </Routes>
        </AuthContext.Provider>
      </QueryClientProvider>
    </MemoryRouter>
  );
}

describe("TransactionsPage", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(listAccounts).mockResolvedValue({
      items: [
        {
          id: "a1",
          name: "Main Wallet",
          type: "cash",
          initial_balance_cents: 1000,
          note: null,
          archived_at: null
        }
      ],
      next_cursor: null
    });
    vi.mocked(listCategories).mockResolvedValue({
      items: [
        { id: "c1", name: "Food", type: "expense", note: null, archived_at: null },
        { id: "c2", name: "Salary", type: "income", note: null, archived_at: null }
      ],
      next_cursor: null
    });
    vi.mocked(listIncomeSources).mockResolvedValue({
      items: [{ id: "s1", name: "Paycheck 1", expected_amount_cents: 250000, frequency: "monthly", is_active: true, archived_at: null, created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z" }]
    });
    vi.mocked(listTransactions).mockResolvedValue({
      items: [
        {
          id: "t1",
          type: "expense",
          account_id: "a1",
          category_id: "c1",
          amount_cents: 4500,
          date: "2026-02-18",
          merchant: "Market",
          note: "weekly",
          archived_at: null,
          created_at: "2026-02-18T10:20:30Z",
          updated_at: "2026-02-18T10:20:30Z"
        }
      ],
      next_cursor: null
    });
    vi.mocked(createTransaction).mockResolvedValue({
      id: "t2",
      type: "expense",
      account_id: "a1",
      category_id: "c1",
      amount_cents: 1000,
      date: "2026-02-19",
      merchant: null,
      note: null,
      archived_at: null,
      created_at: "2026-02-19T10:20:30Z",
      updated_at: "2026-02-19T10:20:30Z"
    });
    vi.mocked(updateTransaction).mockResolvedValue({
      id: "t1",
      type: "expense",
      account_id: "a1",
      category_id: "c1",
      amount_cents: 4500,
      date: "2026-02-18",
      merchant: "Market",
      note: "updated",
      archived_at: null,
      created_at: "2026-02-18T10:20:30Z",
      updated_at: "2026-02-19T10:20:30Z"
    });
    vi.mocked(archiveTransaction).mockResolvedValue();
    vi.mocked(restoreTransaction).mockResolvedValue({
      id: "t1",
      type: "expense",
      account_id: "a1",
      category_id: "c1",
      amount_cents: 4500,
      date: "2026-02-18",
      merchant: "Market",
      note: "weekly",
      archived_at: null,
      created_at: "2026-02-18T10:20:30Z",
      updated_at: "2026-02-19T10:20:30Z"
    });
    vi.mocked(exportTransactionsCsv).mockResolvedValue({
      blob: new Blob(["date,type\n"], { type: "text/csv" }),
      contentDisposition: "attachment; filename=\"transactions.csv\""
    });
    vi.spyOn(downloadUtils, "downloadBlob").mockImplementation(() => undefined);
    vi.spyOn(downloadUtils, "resolveCsvFilename").mockReturnValue("transactions.csv");
  });

  it("edits transaction via patch mutation", async () => {
    renderPage();
    await screen.findByText("Market");

    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    fireEvent.change(screen.getByLabelText("Note"), { target: { value: "updated" } });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() =>
      expect(updateTransaction).toHaveBeenCalledWith(apiClientStub, "t1", expect.objectContaining({ note: "updated" }))
    );
  });

  it("sends explicit nulls when clearing mood and impulse on edit", async () => {
    vi.mocked(listTransactions).mockResolvedValueOnce({
      items: [
        {
          id: "t1",
          type: "expense",
          account_id: "a1",
          category_id: "c1",
          amount_cents: 4500,
          date: "2026-02-18",
          merchant: "Market",
          note: "weekly",
          mood: "happy",
          is_impulse: true,
          archived_at: null,
          created_at: "2026-02-18T10:20:30Z",
          updated_at: "2026-02-18T10:20:30Z"
        }
      ],
      next_cursor: null
    });

    renderPage();
    await screen.findByText("Market");

    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    fireEvent.change(screen.getByLabelText("Mood"), { target: { value: "" } });
    fireEvent.change(screen.getByLabelText("Impulse buy?"), { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() =>
      expect(updateTransaction).toHaveBeenCalledWith(
        apiClientStub,
        "t1",
        expect.objectContaining({
          mood: null,
          is_impulse: null
        })
      )
    );
  });

  it("archives transaction and refetches list", async () => {
    vi.mocked(listTransactions)
      .mockResolvedValueOnce({
        items: [
          {
            id: "t1",
            type: "expense",
            account_id: "a1",
            category_id: "c1",
            amount_cents: 4500,
            date: "2026-02-18",
            merchant: "Market",
            note: "weekly",
            archived_at: null,
            created_at: "2026-02-18T10:20:30Z",
            updated_at: "2026-02-18T10:20:30Z"
          }
        ],
        next_cursor: null
      })
      .mockResolvedValueOnce({ items: [], next_cursor: null });

    renderPage();
    await screen.findByText("Market");

    fireEvent.click(screen.getAllByRole("button", { name: "Archive" })[0]!);
    const dialog = await screen.findByRole("alertdialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Archive" }));

    await waitFor(() => expect(archiveTransaction).toHaveBeenCalledWith(apiClientStub, "t1"));
    expect(await screen.findByText("No transactions found.")).toBeInTheDocument();
  });

  it("restores archived transaction with patch archived_at null", async () => {
    vi.mocked(listTransactions).mockResolvedValueOnce({
      items: [
        {
          id: "t1",
          type: "expense",
          account_id: "a1",
          category_id: "c1",
          amount_cents: 4500,
          date: "2026-02-18",
          merchant: "Market",
          note: "weekly",
          archived_at: "2026-02-20T00:00:00Z",
          created_at: "2026-02-18T10:20:30Z",
          updated_at: "2026-02-20T00:00:00Z"
        }
      ],
      next_cursor: null
    });

    renderPage();
    await screen.findByText("Archived");

    fireEvent.click(screen.getByRole("button", { name: "Restore" }));
    await waitFor(() => expect(restoreTransaction).toHaveBeenCalledWith(apiClientStub, "t1"));
  });

  it("shows specific 409 mismatch message", async () => {
    vi.mocked(updateTransaction).mockRejectedValueOnce(
      new ApiProblemError(409, {
        type: "https://api.budgetbuddy.dev/problems/category-type-mismatch",
        title: "Category type mismatch",
        status: 409
      })
    );

    renderPage();
    await screen.findByText("Market");
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    fireEvent.change(screen.getByLabelText("Note"), { target: { value: "still-valid" } });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    expect(await screen.findByText("Transaction type must match category type.")).toBeInTheDocument();
  });

  it("creates transaction with valid payload", async () => {
    renderPage();
    await screen.findByText("Market");

    expect(screen.getByLabelText("From", { selector: "input" })).toHaveClass("field-date-input");
    expect(screen.getByLabelText("To", { selector: "input" })).toHaveClass("field-date-input");

    fireEvent.click(screen.getByRole("button", { name: "New transaction" }));
    expect(screen.getByLabelText("Date", { selector: "input" })).toHaveClass("field-date-input");
    fireEvent.change(screen.getAllByLabelText("Account")[1]!, { target: { value: "a1" } });
    fireEvent.change(screen.getAllByLabelText("Category")[1]!, { target: { value: "c1" } });
    fireEvent.change(screen.getByLabelText("Amount"), { target: { value: "12.00" } });
    fireEvent.change(screen.getByLabelText("Date", { selector: "input" }), { target: { value: "2026-02-20" } });
    fireEvent.click(screen.getByRole("button", { name: "Create transaction" }));

    await waitFor(() =>
      expect(createTransaction).toHaveBeenCalledWith(
        apiClientStub,
        expect.objectContaining({
          type: "expense",
          account_id: "a1",
          category_id: "c1",
          amount_cents: 1200,
          date: "2026-02-20"
        })
      )
    );
    expect(createTransaction).toHaveBeenCalledWith(
      apiClientStub,
      expect.not.objectContaining({
        mood: expect.anything(),
        is_impulse: expect.anything()
      })
    );
  });

  it("creates transaction with mood and impulse enrichment when selected", async () => {
    renderPage();
    await screen.findByText("Market");

    fireEvent.click(screen.getByRole("button", { name: "New transaction" }));
    fireEvent.change(screen.getAllByLabelText("Account")[1]!, { target: { value: "a1" } });
    fireEvent.change(screen.getAllByLabelText("Category")[1]!, { target: { value: "c1" } });
    fireEvent.change(screen.getByLabelText("Amount"), { target: { value: "12.00" } });
    fireEvent.change(screen.getByLabelText("Date", { selector: "input" }), { target: { value: "2026-02-20" } });
    fireEvent.change(screen.getByLabelText("Mood"), { target: { value: "happy" } });
    fireEvent.change(screen.getByLabelText("Impulse buy?"), { target: { value: "impulsive" } });
    fireEvent.click(screen.getByRole("button", { name: "Create transaction" }));

    await waitFor(() =>
      expect(createTransaction).toHaveBeenCalledWith(
        apiClientStub,
        expect.objectContaining({
          mood: "happy",
          is_impulse: true
        })
      )
    );
  });

  it("shows mood and impulse badges in transaction rows", async () => {
    vi.mocked(listTransactions).mockResolvedValueOnce({
      items: [
        {
          id: "t1",
          type: "expense",
          account_id: "a1",
          category_id: "c1",
          amount_cents: 4500,
          date: "2026-02-18",
          merchant: "Market",
          note: "weekly",
          mood: "happy",
          is_impulse: true,
          archived_at: null,
          created_at: "2026-02-18T10:20:30Z",
          updated_at: "2026-02-18T10:20:30Z"
        }
      ],
      next_cursor: null
    });

    renderPage();
    expect(await screen.findByText("😊 Happy")).toBeInTheDocument();
    expect(screen.getAllByText("Impulsive").length).toBeGreaterThan(0);
  });

  it("blocks create when amount is invalid", async () => {
    renderPage();
    await screen.findByText("Market");

    fireEvent.click(screen.getByRole("button", { name: "New transaction" }));
    fireEvent.change(screen.getAllByLabelText("Account")[1]!, { target: { value: "a1" } });
    fireEvent.change(screen.getAllByLabelText("Category")[1]!, { target: { value: "c1" } });
    fireEvent.change(screen.getByLabelText("Date", { selector: "input" }), { target: { value: "2026-02-20" } });
    fireEvent.change(screen.getByLabelText("Amount"), { target: { value: "1.999" } });
    fireEvent.click(screen.getByRole("button", { name: "Create transaction" }));

    expect(await screen.findByText("Amount must be a positive money value with up to two decimals.")).toBeInTheDocument();
    expect(createTransaction).not.toHaveBeenCalled();
  });

  it("blocks create when amount is zero", async () => {
    renderPage();
    await screen.findByText("Market");

    fireEvent.click(screen.getByRole("button", { name: "New transaction" }));
    fireEvent.change(screen.getAllByLabelText("Account")[1]!, { target: { value: "a1" } });
    fireEvent.change(screen.getAllByLabelText("Category")[1]!, { target: { value: "c1" } });
    fireEvent.change(screen.getByLabelText("Date", { selector: "input" }), { target: { value: "2026-02-20" } });
    fireEvent.change(screen.getByLabelText("Amount"), { target: { value: "0" } });
    fireEvent.click(screen.getByRole("button", { name: "Create transaction" }));

    expect(await screen.findByText("Amount must be a positive money value with up to two decimals.")).toBeInTheDocument();
    expect(createTransaction).not.toHaveBeenCalled();
  });

  it("renders list amounts formatted in user currency instead of raw cents", async () => {
    renderPage();
    await screen.findByText("Market");

    expect(screen.getAllByText(/45\.00/).length).toBeGreaterThan(0);
    expect(screen.queryByText("4500")).not.toBeInTheDocument();
  });

  it("blocks edit when there are no changes", async () => {
    renderPage();
    await screen.findByText("Market");

    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    expect(await screen.findByText("Validation failed. Check your input and try again.")).toBeInTheDocument();
    expect(updateTransaction).not.toHaveBeenCalled();
  });

  it("loads additional transactions with cursor", async () => {
    vi.mocked(listTransactions)
      .mockResolvedValueOnce({
        items: [
          {
            id: "t1",
            type: "expense",
            account_id: "a1",
            category_id: "c1",
            amount_cents: 4500,
            date: "2026-02-18",
            merchant: "Market",
            note: "weekly",
            archived_at: null,
            created_at: "2026-02-18T10:20:30Z",
            updated_at: "2026-02-18T10:20:30Z"
          }
        ],
        next_cursor: "cursor-1"
      })
      .mockResolvedValueOnce({
        items: [
          {
            id: "t2",
            type: "income",
            account_id: "a1",
            category_id: "c2",
            amount_cents: 9000,
            date: "2026-02-19",
            merchant: null,
            note: "salary",
            archived_at: null,
            created_at: "2026-02-19T10:20:30Z",
            updated_at: "2026-02-19T10:20:30Z"
          }
        ],
        next_cursor: null
      });

    renderPage();
    await screen.findByText("Market");
    fireEvent.click(screen.getByRole("button", { name: "Load more" }));

    expect(await screen.findByText("salary")).toBeInTheDocument();
    expect(listTransactions).toHaveBeenLastCalledWith(
      apiClientStub,
      expect.objectContaining({ cursor: "cursor-1" })
    );
  });

  it("shows fallback page problem when list fails unexpectedly", async () => {
    vi.mocked(listTransactions).mockRejectedValueOnce(new Error("boom"));
    renderPage();
    expect(await screen.findByText("Unexpected error. Please retry.")).toBeInTheDocument();
  });

  it("applies list filters and include archived toggle", async () => {
    renderPage();
    await screen.findByText("Market");

    fireEvent.change(screen.getByRole("combobox", { name: "Type" }), { target: { value: "income" } });
    fireEvent.change(screen.getByRole("combobox", { name: "Account" }), { target: { value: "a1" } });
    fireEvent.change(screen.getByRole("combobox", { name: "Category" }), { target: { value: "c1" } });
    fireEvent.click(screen.getByRole("checkbox", { name: "Show archived" }));

    await waitFor(() =>
      expect(listTransactions).toHaveBeenLastCalledWith(
        apiClientStub,
        expect.objectContaining({
          type: "income",
          accountId: "a1",
          categoryId: "c1",
          includeArchived: true
        })
      )
    );
  });

  it("prefills filters from valid query params", async () => {
    renderPage(["/app/transactions?from=2026-02-01&to=2026-02-28&type=income"]);
    await screen.findByText("Market");

    expect(listTransactions).toHaveBeenCalledWith(
      apiClientStub,
      expect.objectContaining({
        type: "income",
        from: "2026-02-01",
        to: "2026-02-28"
      })
    );
  });

  it("normalizes invalid URL date range before first fetch", async () => {
    renderPage(["/app/transactions?from=2026-03-20&to=2026-03-01&type=income"]);
    await screen.findByText("Market");

    expect(listTransactions).not.toHaveBeenCalledWith(
      apiClientStub,
      expect.objectContaining({
        from: "2026-03-20",
        to: "2026-03-01"
      })
    );
  });

  it("preserves valid subset for partial URL range params", async () => {
    renderPage(["/app/transactions?from=2026-03-20&type=income"]);
    await screen.findByText("Market");

    expect(listTransactions).toHaveBeenCalledWith(
      apiClientStub,
      expect.objectContaining({
        from: "2026-03-20",
        to: "2026-03-20",
        type: "income"
      })
    );
  });

  it("resyncs filters when URL query changes after mount", async () => {
    function Harness() {
      const navigate = useNavigate();
      return (
        <>
          <button
            type="button"
            onClick={() => navigate("/app/transactions?from=2026-02-01&to=2026-02-28&type=income")}
          >
            Navigate with filters
          </button>
          <TransactionsPage />
        </>
      );
    }

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
    });
    render(
      <MemoryRouter initialEntries={["/app/transactions"]}>
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
            <Routes>
              <Route path="/app/transactions" element={<Harness />} />
              <Route path="/app/transactions/import" element={<div>Import page</div>} />
            </Routes>
          </AuthContext.Provider>
        </QueryClientProvider>
      </MemoryRouter>
    );
    await screen.findByText("Market");

    fireEvent.click(screen.getByRole("button", { name: "Navigate with filters" }));

    await waitFor(() =>
      expect(listTransactions).toHaveBeenLastCalledWith(
        apiClientStub,
        expect.objectContaining({
          type: "income",
          from: "2026-02-01",
          to: "2026-02-28"
        })
      )
    );
  });

  it("shows a compact more-options menu trigger in the page header", async () => {
    renderPage();
    await screen.findByText("Market");

    expect(screen.getByRole("button", { name: "New transaction" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "More options" })).toBeInTheDocument();
  });

  it("opens create modal when action=new query param is present", async () => {
    renderPage(["/app/transactions?action=new"]);
    await screen.findByText("Market");
    expect(screen.getByRole("button", { name: "Create transaction" })).toBeInTheDocument();
  });

  it("cleans action=new query param after opening create modal", async () => {
    function Harness() {
      const location = useLocation();
      return (
        <>
          <p data-testid="location-search">{location.search}</p>
          <TransactionsPage />
        </>
      );
    }

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
    });
    render(
      <MemoryRouter initialEntries={["/app/transactions?action=new"]}>
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
            <Routes>
              <Route path="/app/transactions" element={<Harness />} />
            </Routes>
          </AuthContext.Provider>
        </QueryClientProvider>
      </MemoryRouter>
    );

    await screen.findByText("Market");
    expect(screen.getByRole("button", { name: "Create transaction" })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByTestId("location-search").textContent).not.toContain("action="));
  });

  it("navigates to import page from the more-options menu", async () => {
    renderPage();
    await screen.findByText("Market");

    fireEvent.click(screen.getByRole("button", { name: "More options" }));
    fireEvent.click(screen.getByRole("button", { name: "Import" }));

    expect(await screen.findByText("Import page")).toBeInTheDocument();
  });

  it("disables export when date range is invalid", async () => {
    renderPage();
    await screen.findByText("Market");

    fireEvent.change(screen.getByLabelText("From", { selector: "input" }), { target: { value: "2026-03-01" } });
    fireEvent.change(screen.getByLabelText("To", { selector: "input" }), { target: { value: "2026-02-01" } });
    fireEvent.click(screen.getByRole("button", { name: "More options" }));

    expect(screen.getByText("From date must be on or before To date.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Export CSV" })).toBeDisabled();
  });

  it("exports csv and triggers download helper", async () => {
    renderPage();
    await screen.findByText("Market");

    fireEvent.click(screen.getByRole("button", { name: "More options" }));
    fireEvent.click(screen.getByRole("button", { name: "Export CSV" }));

    await waitFor(() => expect(exportTransactionsCsv).toHaveBeenCalledWith(apiClientStub, expect.any(Object)));
    expect(downloadUtils.resolveCsvFilename).toHaveBeenCalled();
    expect(downloadUtils.downloadBlob).toHaveBeenCalledWith(expect.any(Blob), "transactions.csv");
  });

  it("shows retry-after guidance when export returns 429", async () => {
    vi.mocked(exportTransactionsCsv).mockRejectedValueOnce(
      new ApiProblemError(429, {
        type: "https://api.budgetbuddy.dev/problems/rate-limited",
        title: "Too Many Requests",
        status: 429,
        detail: "Too many requests. Try again in 30 seconds."
      })
    );

    renderPage();
    await screen.findByText("Market");
    fireEvent.click(screen.getByRole("button", { name: "More options" }));
    fireEvent.click(screen.getByRole("button", { name: "Export CSV" }));

    expect(await screen.findByText("Rate limited. Try again later.")).toBeInTheDocument();
  });
});
