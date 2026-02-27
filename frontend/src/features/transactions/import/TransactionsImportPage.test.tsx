import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ApiClient } from "@/api/client";
import { ApiProblemError } from "@/api/problem";
import { importTransactions } from "@/api/transactions";
import { AuthContext } from "@/auth/AuthContext";
import TransactionsImportPage from "@/features/transactions/import/TransactionsImportPage";

vi.mock("@/api/transactions", () => ({
  importTransactions: vi.fn()
}));

const apiClientStub = {} as ApiClient;

function renderPage() {
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
            logout: async () => undefined,
            bootstrapSession: async () => true
          }}
        >
          <TransactionsImportPage />
        </AuthContext.Provider>
      </QueryClientProvider>
    </MemoryRouter>
  );
}

describe("TransactionsImportPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(importTransactions).mockResolvedValue({
      created_count: 1,
      failed_count: 1,
      failures: [
        {
          index: 1,
          message: "category mismatch",
          problem: {
            type: "https://api.budgetbuddy.dev/problems/category-type-mismatch",
            title: "Category type mismatch",
            status: 409,
            detail: "Transaction type must match category type."
          }
        }
      ]
    });
  });

  it("shows validation error for invalid JSON and keeps import disabled", async () => {
    renderPage();

    const importButton = screen.getByRole("button", { name: "Import" });
    expect(importButton).toBeDisabled();

    fireEvent.change(screen.getByLabelText("JSON input"), { target: { value: "{invalid" } });
    fireEvent.click(screen.getByRole("button", { name: "Validate" }));

    expect(await screen.findByText("Invalid JSON input.")).toBeInTheDocument();
    expect(importButton).toBeDisabled();
  });

  it("handles submit with invalid parsed payload without calling API", async () => {
    renderPage();
    fireEvent.change(screen.getByLabelText("JSON input"), { target: { value: "{invalid" } });

    const form = screen.getByRole("button", { name: "Validate" }).closest("form");
    expect(form).not.toBeNull();
    fireEvent.submit(form!);

    expect(await screen.findByText("Invalid JSON input.")).toBeInTheDocument();
    expect(importTransactions).not.toHaveBeenCalled();
  });

  it("renders import summary and failures table on success", async () => {
    renderPage();

    fireEvent.change(screen.getByLabelText("JSON input"), {
      target: {
        value: JSON.stringify([
          {
            type: "expense",
            account_id: "a1",
            category_id: "c1",
            amount_cents: 4500,
            date: "2026-02-18"
          }
        ])
      }
    });

    fireEvent.click(screen.getByRole("button", { name: "Validate" }));
    const importButton = screen.getByRole("button", { name: "Import" });
    await waitFor(() => expect(importButton).toBeEnabled());

    fireEvent.click(importButton);

    await waitFor(() => expect(importTransactions).toHaveBeenCalled());
    expect(await screen.findByText("Import result")).toBeInTheDocument();
    expect(screen.getByText("Created:")).toBeInTheDocument();
    expect(screen.getByText("1", { selector: "td" })).toBeInTheDocument();
    expect(screen.getByText("category mismatch")).toBeInTheDocument();
  });

  it("shows request-level ProblemDetails when endpoint import fails", async () => {
    vi.mocked(importTransactions).mockRejectedValueOnce(
      new ApiProblemError(400, {
        type: "https://api.budgetbuddy.dev/problems/import-batch-limit-exceeded",
        title: "Import limit exceeded",
        status: 400,
        detail: "Reduce batch size and retry."
      })
    );

    renderPage();

    fireEvent.change(screen.getByLabelText("JSON input"), {
      target: {
        value: JSON.stringify([
          {
            type: "expense",
            account_id: "a1",
            category_id: "c1",
            amount_cents: 4500,
            date: "2026-02-18"
          }
        ])
      }
    });

    fireEvent.click(screen.getByRole("button", { name: "Validate" }));
    fireEvent.click(screen.getByRole("button", { name: "Import" }));

    expect(await screen.findByText("Unexpected error. Please retry.")).toBeInTheDocument();
  });

  it("shows fallback request-level error for non-problem exceptions", async () => {
    vi.mocked(importTransactions).mockRejectedValueOnce(new Error("boom"));

    renderPage();
    fireEvent.change(screen.getByLabelText("JSON input"), {
      target: {
        value: JSON.stringify([
          {
            type: "expense",
            account_id: "a1",
            category_id: "c1",
            amount_cents: 4500,
            date: "2026-02-18"
          }
        ])
      }
    });

    fireEvent.click(screen.getByRole("button", { name: "Validate" }));
    fireEvent.click(screen.getByRole("button", { name: "Import" }));

    expect(await screen.findByText("Unexpected error. Please retry.")).toBeInTheDocument();
  });

  it("shows no-row-failures copy when import has zero failures", async () => {
    vi.mocked(importTransactions).mockResolvedValueOnce({
      created_count: 2,
      failed_count: 0,
      failures: []
    });

    renderPage();
    fireEvent.change(screen.getByLabelText("JSON input"), {
      target: {
        value: JSON.stringify([
          {
            type: "expense",
            account_id: "a1",
            category_id: "c1",
            amount_cents: 4500,
            date: "2026-02-18"
          }
        ])
      }
    });

    fireEvent.click(screen.getByRole("button", { name: "Validate" }));
    fireEvent.click(screen.getByRole("button", { name: "Import" }));

    expect(await screen.findByText("No row failures.")).toBeInTheDocument();
  });

  it("shows warning for large payload on validate", async () => {
    renderPage();
    fireEvent.change(screen.getByLabelText("JSON input"), {
      target: {
        value: JSON.stringify([
          {
            type: "expense",
            account_id: "a1",
            category_id: "c1",
            amount_cents: 4500,
            date: "2026-02-18",
            note: "x".repeat(1_600_000)
          }
        ])
      }
    });

    fireEvent.click(screen.getByRole("button", { name: "Validate" }));
    expect(await screen.findByText("Input is large and may take longer to import.")).toBeInTheDocument();
  });

  it("renders fallback dash values when failure has no problem payload", async () => {
    vi.mocked(importTransactions).mockResolvedValueOnce({
      created_count: 0,
      failed_count: 1,
      failures: [{ index: 0, message: "invalid row" }]
    });

    renderPage();
    fireEvent.change(screen.getByLabelText("JSON input"), {
      target: {
        value: JSON.stringify([
          {
            type: "expense",
            account_id: "a1",
            category_id: "c1",
            amount_cents: 4500,
            date: "2026-02-18"
          }
        ])
      }
    });

    fireEvent.click(screen.getByRole("button", { name: "Validate" }));
    fireEvent.click(screen.getByRole("button", { name: "Import" }));

    expect(await screen.findByText("invalid row")).toBeInTheDocument();
    expect(screen.getAllByText("-").length).toBeGreaterThan(0);
  });

  it("renders a back link to transactions", () => {
    renderPage();
    expect(screen.getByRole("link", { name: "Back to transactions" })).toHaveAttribute("href", "/app/transactions");
  });
});
