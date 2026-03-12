import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";

import type { ApiClient } from "@/api/client";
import {
  archiveIncomeSource,
  createIncomeSource,
  listIncomeSources,
  restoreIncomeSource,
  updateIncomeSource
} from "@/api/incomeSources";
import { AuthContext } from "@/auth/AuthContext";
import IncomeSourcesPage from "@/pages/IncomeSourcesPage";

vi.mock("@/api/incomeSources", () => ({
  listIncomeSources: vi.fn(),
  createIncomeSource: vi.fn(),
  updateIncomeSource: vi.fn(),
  archiveIncomeSource: vi.fn(),
  restoreIncomeSource: vi.fn()
}));

const apiClientStub = {} as ApiClient;

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
  });

  return render(
    <MemoryRouter initialEntries={["/app/income-sources"]}>
      <QueryClientProvider client={queryClient}>
        <AuthContext.Provider
          value={{
            apiClient: apiClientStub,
            user: { id: "u1", username: "demo", currency_code: "COP" },
            accessToken: "token",
            isAuthenticated: true,
            isBootstrapping: false,
            login: async () => undefined,
            register: async () => undefined,
            logout: async () => undefined,
            bootstrapSession: async () => true
          }}
        >
          <IncomeSourcesPage />
        </AuthContext.Provider>
      </QueryClientProvider>
    </MemoryRouter>
  );
}

function setViewport(width: number) {
  Object.defineProperty(window, "innerWidth", {
    configurable: true,
    writable: true,
    value: width
  });
  window.dispatchEvent(new Event("resize"));
}

describe("IncomeSourcesPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(listIncomeSources).mockResolvedValue({
      items: [
        {
          id: "s1",
          name: "Paycheck 1",
          expected_amount_cents: 4000000,
          frequency: "monthly",
          is_active: true,
          note: null,
          archived_at: null,
          created_at: "2026-03-01T00:00:00Z",
          updated_at: "2026-03-01T00:00:00Z"
        }
      ]
    });
    vi.mocked(createIncomeSource).mockResolvedValue({
      id: "s2",
      name: "Freelance",
      expected_amount_cents: 500000,
      frequency: "monthly",
      is_active: true,
      note: null,
      archived_at: null,
      created_at: "2026-03-01T00:00:00Z",
      updated_at: "2026-03-01T00:00:00Z"
    });
    vi.mocked(updateIncomeSource).mockResolvedValue({} as never);
    vi.mocked(archiveIncomeSource).mockResolvedValue();
    vi.mocked(restoreIncomeSource).mockResolvedValue({} as never);
  });

  it("renders expected amounts using user currency display instead of raw cents", async () => {
    renderPage();

    await screen.findByText("Paycheck 1");
    expect(screen.getAllByText(/4,000,000/).length).toBeGreaterThan(0);
    expect(screen.queryByText("4000000")).not.toBeInTheDocument();
  });

  it("converts major-unit input to expected_amount_cents on create", async () => {
    renderPage();
    await screen.findByText("Paycheck 1");

    fireEvent.click(screen.getByRole("button", { name: "New income source" }));
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Freelance" } });
    fireEvent.change(screen.getByLabelText("Expected amount"), { target: { value: "500000" } });
    fireEvent.click(screen.getByRole("button", { name: "Create income source" }));

    await waitFor(() =>
      expect(createIncomeSource).toHaveBeenCalledWith(
        apiClientStub,
        expect.objectContaining({
          name: "Freelance",
          expected_amount_cents: 500000
        })
      )
    );
  });

  it("updates an existing income source with converted cents", async () => {
    vi.mocked(updateIncomeSource).mockResolvedValue({
      id: "s1",
      name: "Paycheck 1",
      expected_amount_cents: 4500000,
      frequency: "monthly",
      is_active: true,
      note: null,
      archived_at: null,
      created_at: "2026-03-01T00:00:00Z",
      updated_at: "2026-03-01T00:00:00Z"
    });

    renderPage();
    await screen.findByText("Paycheck 1");

    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    fireEvent.change(screen.getByLabelText("Expected amount"), { target: { value: "4500000" } });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() =>
        expect(updateIncomeSource).toHaveBeenCalledWith(
        apiClientStub,
        "s1",
        expect.objectContaining({ expected_amount_cents: 4500000 })
      )
    );
  });

  it("archives an active income source", async () => {
    renderPage();
    await screen.findByText("Paycheck 1");

    fireEvent.click(screen.getByRole("button", { name: "Archive" }));
    const dialog = await screen.findByRole("alertdialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Archive" }));

    await waitFor(() => expect(archiveIncomeSource).toHaveBeenCalledWith(apiClientStub, "s1"));
  });

  it("restores archived income source row", async () => {
    vi.mocked(listIncomeSources).mockResolvedValueOnce({
      items: [
        {
          id: "s1",
          name: "Paycheck 1",
          expected_amount_cents: 4000000,
          frequency: "monthly",
          is_active: true,
          note: null,
          archived_at: "2026-03-02T00:00:00Z",
          created_at: "2026-03-01T00:00:00Z",
          updated_at: "2026-03-01T00:00:00Z"
        }
      ]
    });

    renderPage();
    await screen.findByText("Archived");
    fireEvent.click(screen.getByRole("button", { name: "Restore" }));

    await waitFor(() => expect(restoreIncomeSource).toHaveBeenCalledWith(apiClientStub, "s1"));
  });

  it("blocks submit with invalid expected amount input", async () => {
    renderPage();
    await screen.findByText("Paycheck 1");

    fireEvent.click(screen.getByRole("button", { name: "New income source" }));
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Freelance" } });
    fireEvent.change(screen.getByLabelText("Expected amount"), { target: { value: "1.999" } });
    fireEvent.click(screen.getByRole("button", { name: "Create income source" }));

    expect(createIncomeSource).not.toHaveBeenCalled();
  });

  it("renders empty state when no sources are returned", async () => {
    vi.mocked(listIncomeSources).mockResolvedValueOnce({ items: [] });
    renderPage();

    expect(await screen.findByText("No income sources found.")).toBeInTheDocument();
  });

  it("renders mobile cards and opens edit modal from card actions", async () => {
    setViewport(375);
    renderPage();

    await screen.findByText("Paycheck 1");
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    expect(screen.getByRole("heading", { name: "Edit income source" })).toBeInTheDocument();
  });

  it("keeps page stable when archive request fails", async () => {
    vi.mocked(archiveIncomeSource).mockRejectedValueOnce(new Error("boom"));
    renderPage();
    await screen.findByText("Paycheck 1");

    fireEvent.click(screen.getByRole("button", { name: "Archive" }));
    const dialog = await screen.findByRole("alertdialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Archive" }));

    await waitFor(() => expect(archiveIncomeSource).toHaveBeenCalledWith(apiClientStub, "s1"));
    expect(screen.getByText("Unexpected error. Please retry.")).toBeInTheDocument();
  });

  it("keeps form open when create mutation fails", async () => {
    vi.mocked(createIncomeSource).mockRejectedValueOnce(new Error("create_failed"));
    renderPage();
    await screen.findByText("Paycheck 1");

    fireEvent.click(screen.getByRole("button", { name: "New income source" }));
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Consulting" } });
    fireEvent.change(screen.getByLabelText("Expected amount"), { target: { value: "3000" } });
    fireEvent.click(screen.getByRole("button", { name: "Create income source" }));

    await waitFor(() => expect(createIncomeSource).toHaveBeenCalledTimes(1));
    expect(screen.getByRole("heading", { name: "Create income source" })).toBeInTheDocument();
  });

  it("shows page problem when restore request fails", async () => {
    vi.mocked(listIncomeSources).mockResolvedValueOnce({
      items: [
        {
          id: "s1",
          name: "Paycheck 1",
          expected_amount_cents: 4000000,
          frequency: "monthly",
          is_active: true,
          note: null,
          archived_at: "2026-03-02T00:00:00Z",
          created_at: "2026-03-01T00:00:00Z",
          updated_at: "2026-03-01T00:00:00Z"
        }
      ]
    });
    vi.mocked(restoreIncomeSource).mockRejectedValueOnce(new Error("restore_failed"));

    renderPage();
    await screen.findByText("Archived");
    fireEvent.click(screen.getByRole("button", { name: "Restore" }));

    await waitFor(() => expect(restoreIncomeSource).toHaveBeenCalledWith(apiClientStub, "s1"));
    expect(screen.getByText("Unexpected error. Please retry.")).toBeInTheDocument();
  });
});
