import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ApiClient } from "@/api/client";
import {
  archiveCategory,
  createCategory,
  listCategories,
  restoreCategory,
  updateCategory
} from "@/api/categories";
import { ApiProblemError } from "@/api/problem";
import { AuthContext } from "@/auth/AuthContext";
import CategoriesPage from "@/pages/CategoriesPage";

vi.mock("@/api/categories", () => ({
  listCategories: vi.fn(),
  createCategory: vi.fn(),
  updateCategory: vi.fn(),
  archiveCategory: vi.fn(),
  restoreCategory: vi.fn()
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
          register: async () => undefined,
          logout: async () => undefined,
          bootstrapSession: async () => true
        }}
      >
        <CategoriesPage />
      </AuthContext.Provider>
    </QueryClientProvider>
  );
}

describe("CategoriesPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(listCategories).mockResolvedValue({
      items: [
        {
          id: "c1",
          name: "Groceries",
          type: "expense",
          note: "weekly",
          archived_at: null
        },
        {
          id: "c2",
          name: "Salary",
          type: "income",
          note: null,
          archived_at: "2026-02-10T00:00:00Z"
        }
      ],
      next_cursor: null
    });
    vi.mocked(createCategory).mockResolvedValue({
      id: "c3",
      name: "Transport",
      type: "expense",
      note: null,
      archived_at: null
    });
    vi.mocked(updateCategory).mockResolvedValue({
      id: "c1",
      name: "Groceries Updated",
      type: "expense",
      note: "weekly",
      archived_at: null
    });
    vi.mocked(archiveCategory).mockResolvedValue();
    vi.mocked(restoreCategory).mockResolvedValue({
      id: "c2",
      name: "Salary",
      type: "income",
      note: null,
      archived_at: null
    });
  });

  it("loads categories with default filters", async () => {
    renderPage();

    expect(await screen.findByText("Groceries")).toBeInTheDocument();
    expect(listCategories).toHaveBeenCalledWith(
      apiClientStub,
      expect.objectContaining({ includeArchived: false, type: "all" })
    );
  });

  it("creates a category via modal form", async () => {
    renderPage();
    await screen.findByText("Groceries");

    fireEvent.click(screen.getByRole("button", { name: "New category" }));
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Travel" } });
    fireEvent.click(screen.getByRole("button", { name: "Create category" }));

    await waitFor(() =>
      expect(createCategory).toHaveBeenCalledWith(apiClientStub, expect.objectContaining({ name: "Travel" }))
    );
  });

  it("archives and restores categories", async () => {
    renderPage();
    await screen.findByText("Groceries");

    fireEvent.click(screen.getAllByRole("button", { name: "Archive" })[0]!);
    fireEvent.click(screen.getAllByRole("button", { name: "Archive" })[1]!);
    await waitFor(() => expect(archiveCategory).toHaveBeenCalledWith(apiClientStub, "c1"));

    fireEvent.click(screen.getByRole("button", { name: "Restore" }));
    await waitFor(() => expect(restoreCategory).toHaveBeenCalledWith(apiClientStub, "c2"));
  });

  it("shows archive fallback when api error has no problem payload", async () => {
    vi.mocked(archiveCategory).mockRejectedValueOnce(new ApiProblemError(409, null));
    renderPage();
    await screen.findByText("Groceries");

    fireEvent.click(screen.getAllByRole("button", { name: "Archive" })[0]!);
    fireEvent.click(screen.getAllByRole("button", { name: "Archive" })[1]!);

    expect(await screen.findByText(/Unexpected client error\.|request_failed/)).toBeInTheDocument();
  });

  it("shows archive fallback for unexpected archive failure", async () => {
    vi.mocked(archiveCategory).mockRejectedValueOnce(new Error("boom"));
    renderPage();
    await screen.findByText("Groceries");

    fireEvent.click(screen.getAllByRole("button", { name: "Archive" })[0]!);
    fireEvent.click(screen.getAllByRole("button", { name: "Archive" })[1]!);

    expect(await screen.findByText(/Unexpected client error\.|request_failed/)).toBeInTheDocument();
  });

  it("resets request params when type filter changes", async () => {
    renderPage();
    await screen.findByText("Groceries");

    fireEvent.change(screen.getByRole("combobox", { name: "Type" }), {
      target: { value: "income" }
    });

    await waitFor(() =>
      expect(listCategories).toHaveBeenLastCalledWith(
        apiClientStub,
        expect.objectContaining({ type: "income", includeArchived: false })
      )
    );
  });

  it("refetches when show archived toggle changes", async () => {
    renderPage();
    await screen.findByText("Groceries");

    fireEvent.click(screen.getByRole("checkbox", { name: "Show archived" }));
    await waitFor(() =>
      expect(listCategories).toHaveBeenLastCalledWith(
        apiClientStub,
        expect.objectContaining({ includeArchived: true })
      )
    );
  });

  it("updates category via edit modal", async () => {
    renderPage();
    await screen.findByText("Groceries");

    fireEvent.click(screen.getAllByRole("button", { name: "Edit" })[0]!);
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Food" } });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() =>
      expect(updateCategory).toHaveBeenCalledWith(
        apiClientStub,
        "c1",
        expect.objectContaining({ name: "Food" })
      )
    );
  });

  it("appends second page on load more", async () => {
    vi.mocked(listCategories)
      .mockResolvedValueOnce({
        items: [
          {
            id: "c1",
            name: "Groceries",
            type: "expense",
            note: "weekly",
            archived_at: null
          }
        ],
        next_cursor: "cursor-1"
      })
      .mockResolvedValueOnce({
        items: [
          {
            id: "c9",
            name: "Transport",
            type: "expense",
            note: null,
            archived_at: null
          }
        ],
        next_cursor: null
      });

    renderPage();
    await screen.findByText("Groceries");
    fireEvent.click(screen.getByRole("button", { name: "Load more" }));

    expect(await screen.findByText("Transport")).toBeInTheDocument();
    expect(listCategories).toHaveBeenLastCalledWith(
      apiClientStub,
      expect.objectContaining({ cursor: "cursor-1" })
    );
  });

  it("shows forbidden banner when list fails with 403 problem", async () => {
    vi.mocked(listCategories).mockRejectedValueOnce(
      new ApiProblemError(403, {
        type: "https://api.budgetbuddy.dev/problems/forbidden",
        title: "Forbidden",
        status: 403
      })
    );
    renderPage();
    expect(await screen.findByText("Forbidden")).toBeInTheDocument();
  });

  it("shows client contract error banner for 406 responses", async () => {
    vi.mocked(listCategories).mockRejectedValueOnce(
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

  it("shows fallback list banner when ApiProblemError has no problem payload", async () => {
    vi.mocked(listCategories).mockRejectedValueOnce(new ApiProblemError(406, null));
    renderPage();
    expect(await screen.findByText(/Failed to load categories|request_failed/)).toBeInTheDocument();
  });

  it("shows fallback restore banner for unexpected restore failures", async () => {
    vi.mocked(restoreCategory).mockRejectedValueOnce(new Error("boom"));
    renderPage();
    await screen.findByText("Groceries");

    fireEvent.click(screen.getByRole("button", { name: "Restore" }));
    expect(await screen.findByText(/Unexpected client error\.|request_failed/)).toBeInTheDocument();
  });

  it("shows restore fallback when api error has no problem payload", async () => {
    vi.mocked(restoreCategory).mockRejectedValueOnce(new ApiProblemError(409, null));
    renderPage();
    await screen.findByText("Groceries");

    fireEvent.click(screen.getByRole("button", { name: "Restore" }));
    expect(await screen.findByText(/Unexpected client error\.|request_failed/)).toBeInTheDocument();
  });

  it("allows changing type/note fields and closing modal", async () => {
    renderPage();
    await screen.findByText("Groceries");

    fireEvent.click(screen.getByRole("button", { name: "New category" }));
    fireEvent.change(screen.getAllByLabelText("Type")[1]!, { target: { value: "income" } });
    fireEvent.change(screen.getByLabelText("Note"), { target: { value: "monthly" } });
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.queryByText("Create category")).not.toBeInTheDocument();
  });

  it("dismisses page and form error banners", async () => {
    vi.mocked(listCategories).mockRejectedValueOnce(
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

    vi.mocked(createCategory).mockRejectedValueOnce(new ApiProblemError(409, null));
    fireEvent.click(screen.getByRole("button", { name: "New category" }));
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Duplicate" } });
    fireEvent.click(screen.getByRole("button", { name: "Create category" }));
    expect(await screen.findByText(/Unexpected client error\.|request_failed/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    await waitFor(() =>
      expect(screen.queryByText(/Unexpected client error\.|request_failed/)).not.toBeInTheDocument(),
    );
  });

  it("cancels archive dialog without API call", async () => {
    renderPage();
    await screen.findByText("Groceries");

    fireEvent.click(screen.getAllByRole("button", { name: "Archive" })[0]!);
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    await waitFor(() => expect(screen.queryByText("Archive category?")).not.toBeInTheDocument());
    expect(archiveCategory).not.toHaveBeenCalled();
  });
});


