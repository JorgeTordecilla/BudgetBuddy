import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi, beforeEach } from "vitest";

import type { ApiClient } from "@/api/client";
import { archiveAccount, createAccount, listAccounts, updateAccount } from "@/api/accounts";
import { ApiProblemError } from "@/api/problem";
import { AuthContext } from "@/auth/AuthContext";
import AccountsPage from "@/pages/AccountsPage";

vi.mock("@/api/accounts", () => ({
  listAccounts: vi.fn(),
  createAccount: vi.fn(),
  updateAccount: vi.fn(),
  archiveAccount: vi.fn()
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
        <AccountsPage />
      </AuthContext.Provider>
    </QueryClientProvider>
  );
}

describe("AccountsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(listAccounts).mockResolvedValue({
      items: [
        {
          id: "a1",
          name: "Main Wallet",
          type: "cash",
          initial_balance_cents: 1000,
          note: "daily",
          archived_at: null
        }
      ],
      next_cursor: null
    });
    vi.mocked(createAccount).mockResolvedValue({
      id: "a2",
      name: "Bank",
      type: "bank",
      initial_balance_cents: 2000,
      note: null,
      archived_at: null
    });
    vi.mocked(archiveAccount).mockResolvedValue();
  });

  it("loads and renders account rows", async () => {
    renderPage();

    expect(await screen.findByText("Main Wallet")).toBeInTheDocument();
    expect(listAccounts).toHaveBeenCalledWith(apiClientStub, expect.objectContaining({ includeArchived: false }));
  });

  it("creates a new account via modal form", async () => {
    renderPage();
    await screen.findByText("Main Wallet");

    fireEvent.click(screen.getByRole("button", { name: "New account" }));
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Savings" } });
    fireEvent.change(screen.getByLabelText("Initial balance (cents)"), { target: { value: "5000" } });
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));

    await waitFor(() =>
      expect(createAccount).toHaveBeenCalledWith(
        apiClientStub,
        expect.objectContaining({ name: "Savings", initial_balance_cents: 5000 })
      )
    );
  });

  it("archives account after confirmation", async () => {
    renderPage();
    await screen.findByText("Main Wallet");

    fireEvent.click(screen.getAllByRole("button", { name: "Archive" })[0]!);
    fireEvent.click(screen.getAllByRole("button", { name: "Archive" })[1]!);

    await waitFor(() => expect(archiveAccount).toHaveBeenCalledWith(apiClientStub, "a1"));
  });

  it("refetches with include_archived=true when toggle changes", async () => {
    renderPage();
    await screen.findByText("Main Wallet");

    fireEvent.click(screen.getByRole("checkbox", { name: "Show archived" }));

    await waitFor(() =>
      expect(listAccounts).toHaveBeenLastCalledWith(apiClientStub, expect.objectContaining({ includeArchived: true }))
    );
  });

  it("updates account when editing existing row", async () => {
    renderPage();
    await screen.findByText("Main Wallet");

    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Main Updated" } });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() =>
      expect(updateAccount).toHaveBeenCalledWith(
        apiClientStub,
        "a1",
        expect.objectContaining({ name: "Main Updated" })
      )
    );
  });

  it("shows validation problem for non-integer cents", async () => {
    renderPage();
    await screen.findByText("Main Wallet");

    fireEvent.click(screen.getByRole("button", { name: "New account" }));
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Invalid" } });
    fireEvent.change(screen.getByLabelText("Initial balance (cents)"), { target: { value: "1.5" } });
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));

    expect(await screen.findByText("Invalid amount")).toBeInTheDocument();
    expect(createAccount).not.toHaveBeenCalled();
  });

  it("appends items when loading more pages", async () => {
    vi.mocked(listAccounts)
      .mockResolvedValueOnce({
        items: [
          {
            id: "a1",
            name: "Main Wallet",
            type: "cash",
            initial_balance_cents: 1000,
            note: "daily",
            archived_at: null
          }
        ],
        next_cursor: "cursor-1"
      })
      .mockResolvedValueOnce({
        items: [
          {
            id: "a2",
            name: "Savings",
            type: "bank",
            initial_balance_cents: 3000,
            note: null,
            archived_at: null
          }
        ],
        next_cursor: null
      });

    renderPage();
    await screen.findByText("Main Wallet");
    fireEvent.click(screen.getByRole("button", { name: "Load more" }));

    expect(await screen.findByText("Savings")).toBeInTheDocument();
    expect(listAccounts).toHaveBeenLastCalledWith(
      apiClientStub,
      expect.objectContaining({ cursor: "cursor-1" })
    );
  });

  it("shows banner when list request fails with problem details", async () => {
    vi.mocked(listAccounts).mockRejectedValueOnce(
      new ApiProblemError(403, {
        type: "https://api.budgetbuddy.dev/problems/forbidden",
        title: "Forbidden",
        status: 403,
        detail: "Not allowed"
      })
    );

    renderPage();
    expect(await screen.findByText("Forbidden")).toBeInTheDocument();
    expect(screen.getByText("Not allowed")).toBeInTheDocument();
  });

  it("shows client contract error banner for 406 responses", async () => {
    vi.mocked(listAccounts).mockRejectedValueOnce(
      new ApiProblemError(406, {
        type: "https://api.budgetbuddy.dev/problems/not-acceptable",
        title: "",
        status: 406,
        detail: "Invalid Accept header"
      })
    );

    renderPage();
    expect(await screen.findByText("Client contract error")).toBeInTheDocument();
    expect(screen.getByText("Invalid Accept header")).toBeInTheDocument();
  });

  it("shows empty state when list is empty", async () => {
    vi.mocked(listAccounts).mockResolvedValueOnce({ items: [], next_cursor: null });
    renderPage();
    expect(await screen.findByText("No accounts found.")).toBeInTheDocument();
  });

  it("shows fallback error when save fails unexpectedly", async () => {
    vi.mocked(createAccount).mockRejectedValueOnce(new Error("boom"));
    renderPage();
    await screen.findByText("Main Wallet");

    fireEvent.click(screen.getByRole("button", { name: "New account" }));
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Fallback" } });
    fireEvent.change(screen.getByLabelText("Initial balance (cents)"), { target: { value: "100" } });
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));

    expect(await screen.findByText("Failed to save account")).toBeInTheDocument();
  });

  it("shows save fallback problem when api error has no problem payload", async () => {
    vi.mocked(createAccount).mockRejectedValueOnce(new ApiProblemError(409, null));
    renderPage();
    await screen.findByText("Main Wallet");

    fireEvent.click(screen.getByRole("button", { name: "New account" }));
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Duplicate" } });
    fireEvent.change(screen.getByLabelText("Initial balance (cents)"), { target: { value: "100" } });
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));

    expect(await screen.findByText("request_failed")).toBeInTheDocument();
  });

  it("shows fallback banner when archive fails unexpectedly", async () => {
    vi.mocked(archiveAccount).mockRejectedValueOnce(new Error("boom"));
    renderPage();
    await screen.findByText("Main Wallet");

    fireEvent.click(screen.getAllByRole("button", { name: "Archive" })[0]!);
    fireEvent.click(screen.getAllByRole("button", { name: "Archive" })[1]!);

    expect(await screen.findByText("Failed to archive account")).toBeInTheDocument();
  });

  it("shows archive fallback problem when api error has no problem payload", async () => {
    vi.mocked(archiveAccount).mockRejectedValueOnce(new ApiProblemError(409, null));
    renderPage();
    await screen.findByText("Main Wallet");

    fireEvent.click(screen.getAllByRole("button", { name: "Archive" })[0]!);
    fireEvent.click(screen.getAllByRole("button", { name: "Archive" })[1]!);

    expect(await screen.findByText("request_failed")).toBeInTheDocument();
  });

  it("hides archive action for archived accounts", async () => {
    vi.mocked(listAccounts).mockResolvedValueOnce({
      items: [
        {
          id: "a9",
          name: "Old Account",
          type: "cash",
          initial_balance_cents: 0,
          note: null,
          archived_at: "2026-02-10T00:00:00Z"
        }
      ],
      next_cursor: null
    });
    renderPage();

    expect(await screen.findByText("Old Account")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Archive" })).not.toBeInTheDocument();
  });

  it("allows changing type/note fields and closing modal", async () => {
    renderPage();
    await screen.findByText("Main Wallet");

    fireEvent.click(screen.getByRole("button", { name: "New account" }));
    fireEvent.change(screen.getByLabelText("Type"), { target: { value: "bank" } });
    fireEvent.change(screen.getByLabelText("Note"), { target: { value: "my note" } });
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.queryByText("Create account")).not.toBeInTheDocument();
  });

  it("dismisses page and form problem banners", async () => {
    vi.mocked(listAccounts).mockRejectedValueOnce(
      new ApiProblemError(403, {
        type: "https://api.budgetbuddy.dev/problems/forbidden",
        title: "Forbidden",
        status: 403,
        detail: "Not allowed"
      })
    );
    renderPage();
    expect(await screen.findByText("Forbidden")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    await waitFor(() => expect(screen.queryByText("Forbidden")).not.toBeInTheDocument());

    vi.mocked(createAccount).mockRejectedValueOnce(new ApiProblemError(409, null));
    fireEvent.click(screen.getByRole("button", { name: "New account" }));
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Duplicate" } });
    fireEvent.change(screen.getByLabelText("Initial balance (cents)"), { target: { value: "100" } });
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));
    expect(await screen.findByText("request_failed")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    await waitFor(() => expect(screen.queryByText("request_failed")).not.toBeInTheDocument());
  });

  it("cancels archive dialog without API call", async () => {
    renderPage();
    await screen.findByText("Main Wallet");

    fireEvent.click(screen.getAllByRole("button", { name: "Archive" })[0]!);
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    await waitFor(() => expect(screen.queryByText("Archive account?")).not.toBeInTheDocument());
    expect(archiveAccount).not.toHaveBeenCalled();
  });
});
