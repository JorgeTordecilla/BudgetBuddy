import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactElement } from "react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ApiClient } from "@/api/client";
import { ApiProblemError } from "@/api/problem";
import { AuthContext } from "@/auth/AuthContext";
import { listAccounts } from "@/api/accounts";
import { listCategories } from "@/api/categories";
import { listIncomeSources } from "@/api/incomeSources";
import { createTransaction } from "@/api/transactions";
import { publishSuccessToast } from "@/components/feedback/successToastStore";
import AppShell from "@/routes/AppShell";
import RequireAuth from "@/routes/RequireAuth";

vi.mock("@/api/accounts", () => ({ listAccounts: vi.fn() }));
vi.mock("@/api/categories", () => ({ listCategories: vi.fn() }));
vi.mock("@/api/incomeSources", () => ({ listIncomeSources: vi.fn() }));
vi.mock("@/api/transactions", () => ({ createTransaction: vi.fn() }));
vi.mock("@/components/feedback/successToastStore", () => ({ publishSuccessToast: vi.fn() }));
vi.mock("@/components/pwa/InstallPrompt", () => ({
  default: () => <div data-testid="install-prompt-marker">InstallPrompt</div>
}));

const apiClientStub = {} as ApiClient;

describe("AppShell", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(listIncomeSources).mockResolvedValue({ items: [] });
  });

  function renderWithQueryClient(ui: ReactElement) {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
    });
    return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
  }

  function setupModalDataMocks() {
    vi.mocked(listAccounts).mockResolvedValue({
      items: [{ id: "a1", name: "Main", type: "cash", initial_balance_cents: 0, archived_at: null }],
      next_cursor: null
    });
    vi.mocked(listCategories).mockResolvedValue({
      items: [{ id: "c1", name: "Food", type: "expense", archived_at: null }],
      next_cursor: null
    });
    vi.mocked(listIncomeSources).mockResolvedValue({
      items: []
    });
  }

  function renderShellAt(width: number) {
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      writable: true,
      value: width
    });
    window.dispatchEvent(new Event("resize"));

    return renderWithQueryClient(
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
        <MemoryRouter initialEntries={["/app/dashboard"]}>
          <Routes>
            <Route path="/app" element={<AppShell />}>
              <Route path="dashboard" element={<div>Inside app</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>
    );
  }

  it("calls logout and redirects to login", async () => {
    const logout = vi.fn(async () => undefined);
    renderWithQueryClient(
      <AuthContext.Provider
        value={{
          apiClient: apiClientStub,
          user: { id: "u1", username: "demo", currency_code: "USD" },
          accessToken: "token",
          isAuthenticated: true,
          isBootstrapping: false,
          login: async () => undefined,
          register: async () => undefined,
          logout,
          bootstrapSession: async () => true
        }}
      >
        <MemoryRouter initialEntries={["/app"]}>
          <Routes>
            <Route path="/app" element={<AppShell />}>
              <Route index element={<div>Inside app</div>} />
            </Route>
            <Route path="/login" element={<div>Login page</div>} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>
    );

    fireEvent.click(screen.getByRole("button", { name: "Logout" }));
    await waitFor(() => expect(screen.getByText("Login page")).toBeInTheDocument());
    expect(logout).toHaveBeenCalledTimes(1);
  });

  it("redirects to login even when logout fails", async () => {
    const logout = vi.fn(async () => {
      throw new Error("logout_failed");
    });
    renderWithQueryClient(
      <AuthContext.Provider
        value={{
          apiClient: apiClientStub,
          user: { id: "u1", username: "demo", currency_code: "USD" },
          accessToken: "token",
          isAuthenticated: true,
          isBootstrapping: false,
          login: async () => undefined,
          register: async () => undefined,
          logout,
          bootstrapSession: async () => true
        }}
      >
        <MemoryRouter initialEntries={["/app"]}>
          <Routes>
            <Route path="/app" element={<AppShell />}>
              <Route index element={<div>Inside app</div>} />
            </Route>
            <Route path="/login" element={<div>Login page</div>} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>
    );

    fireEvent.click(screen.getByRole("button", { name: "Logout" }));
    await waitFor(() => expect(screen.getByText("Login page")).toBeInTheDocument());
    expect(logout).toHaveBeenCalledTimes(1);
  });

  it("renders setup navigation links", () => {
    renderWithQueryClient(
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
        <MemoryRouter initialEntries={["/app/dashboard"]}>
          <Routes>
            <Route path="/app" element={<AppShell />}>
              <Route path="dashboard" element={<div>Inside app</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>
    );

    expect(screen.getByRole("link", { name: "Accounts" })).toHaveAttribute("href", "/app/accounts");
    expect(screen.getByRole("link", { name: "Analytics" })).toHaveAttribute("href", "/app/analytics");
    expect(screen.getByRole("link", { name: "Categories" })).toHaveAttribute("href", "/app/categories");
    expect(screen.getByRole("link", { name: "Income Sources" })).toHaveAttribute("href", "/app/income-sources");
    expect(screen.getByRole("link", { name: "Bills" })).toHaveAttribute("href", "/app/bills");
    expect(screen.getByRole("link", { name: "Savings" })).toHaveAttribute("href", "/app/savings");
    expect(screen.getByRole("link", { name: "Budgets" })).toHaveAttribute("href", "/app/budgets");
    expect(screen.getByRole("link", { name: "Transactions" })).toHaveAttribute("href", "/app/transactions");
  });

  it("renders install prompt marker below the shell header", () => {
    setupModalDataMocks();
    renderShellAt(375);

    const header = screen.getByRole("banner");
    const promptMarker = screen.getByTestId("install-prompt-marker");
    expect(header.compareDocumentPosition(promptMarker) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("keeps primary navigation accessible on mobile width", () => {
    setupModalDataMocks();
    renderShellAt(375);
    const mobileNav = screen.getByRole("navigation", { name: "Main" });
    expect(mobileNav).toBeInTheDocument();
    expect(mobileNav).toHaveClass("inset-x-0");
    const navCard = mobileNav.firstElementChild as HTMLElement;
    expect(navCard).toHaveClass("max-w-none");
    expect(screen.getByRole("link", { name: "Dashboard" })).toBeInTheDocument();
  });

  it("keeps the full authenticated route set available across mobile primary and overflow navigation", () => {
    setupModalDataMocks();
    renderShellAt(375);

    for (const linkName of ["Dashboard", "Transactions", "Budgets", "Analytics"]) {
      expect(screen.getByRole("link", { name: linkName })).toBeInTheDocument();
    }

    fireEvent.click(screen.getByRole("button", { name: "More" }));

    for (const [linkName, href] of [
      ["Accounts", "/app/accounts"],
      ["Categories", "/app/categories"],
      ["Income Sources", "/app/income-sources"],
      ["Bills", "/app/bills"],
      ["Savings", "/app/savings"]
    ] as const) {
      expect(screen.getByRole("link", { name: linkName })).toHaveAttribute("href", href);
    }
  });

  it("keeps focus on More trigger when opening overflow menu on mobile", async () => {
    setupModalDataMocks();
    renderShellAt(375);

    const moreButton = screen.getByRole("button", { name: "More" });
    fireEvent.click(moreButton);

    await waitFor(() => {
      expect(document.activeElement).toBe(moreButton);
    });
    expect(screen.getByRole("button", { name: "Logout" })).toBeInTheDocument();
  });

  it("uses standalone-safe bottom nav sizing when display-mode is standalone on mobile", () => {
    setupModalDataMocks();
    const matchMediaSpy = vi.spyOn(window, "matchMedia").mockImplementation((query: string) => ({
      matches: query === "(display-mode: standalone)",
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(() => false)
    }) as MediaQueryList);

    renderShellAt(375);
    const mobileNav = screen.getByRole("navigation", { name: "Main" });
    expect(mobileNav).toHaveClass("bottom-[max(0px,_calc(env(safe-area-inset-bottom)_-_0.25rem))]");
    const navCard = mobileNav.firstElementChild as HTMLElement;
    expect(navCard).toHaveClass("max-w-[30rem]");
    matchMediaSpy.mockRestore();
  });

  it("opens overflow menu on mobile and navigates to secondary routes", async () => {
    setupModalDataMocks();
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      writable: true,
      value: 375
    });
    window.dispatchEvent(new Event("resize"));
    renderWithQueryClient(
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
        <MemoryRouter initialEntries={["/app/dashboard"]}>
          <Routes>
            <Route path="/app" element={<AppShell />}>
              <Route path="dashboard" element={<div>Dashboard view</div>} />
              <Route path="accounts" element={<div>Accounts view</div>} />
              <Route path="categories" element={<div>Categories view</div>} />
              <Route path="income-sources" element={<div>Income Sources view</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>
    );

    fireEvent.click(screen.getByRole("button", { name: "More" }));
    fireEvent.click(screen.getByRole("link", { name: "Accounts" }));
    expect(await screen.findByText("Accounts view")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "More" }));
    fireEvent.click(screen.getByRole("link", { name: "Categories" }));
    expect(await screen.findByText("Categories view")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "More" }));
    fireEvent.click(screen.getByRole("link", { name: "Income Sources" }));
    expect(await screen.findByText("Income Sources view")).toBeInTheDocument();
  });

  it("reflows shell controls when crossing mobile to tablet breakpoint", () => {
    setupModalDataMocks();
    renderShellAt(767);
    expect(screen.queryByRole("button", { name: "Logout" })).not.toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Main" })).toBeInTheDocument();

    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      writable: true,
      value: 1024
    });
    window.dispatchEvent(new Event("resize"));

    expect(screen.getByRole("button", { name: "More" })).toBeInTheDocument();
  });

  it("renders desktop shell controls at tablet-and-up widths", async () => {
    setupModalDataMocks();
    renderShellAt(820);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Logout" })).toBeInTheDocument();
    });
    expect(screen.getByRole("navigation", { name: "Main" })).toBeInTheDocument();
  });

  it("keeps primary navigation accessible on desktop width", () => {
    setupModalDataMocks();
    renderShellAt(1280);
    expect(screen.getByRole("navigation", { name: "Main" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Categories" })).toBeInTheDocument();
  });

  it("opens quick transaction modal from mobile + without navigating to transactions", async () => {
    setupModalDataMocks();
    renderShellAt(375);

    fireEvent.click(screen.getByRole("button", { name: "Create transaction" }));

    expect(await screen.findByRole("heading", { name: "Create transaction" })).toBeInTheDocument();
    expect(screen.getByText("Inside app")).toBeInTheDocument();
  });

  it("does not render quick transaction CTA outside dashboard/transactions context", async () => {
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      writable: true,
      value: 375
    });
    window.dispatchEvent(new Event("resize"));

    renderWithQueryClient(
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
        <MemoryRouter initialEntries={["/app/accounts"]}>
          <Routes>
            <Route path="/app" element={<AppShell />}>
              <Route path="accounts" element={<div>Accounts content</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>
    );

    expect(await screen.findByText("Accounts content")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Create transaction" })).not.toBeInTheDocument();
  });

  it("submits quick transaction and emits success toast", async () => {
    setupModalDataMocks();
    vi.mocked(createTransaction).mockResolvedValue({
      id: "tx-1",
      type: "expense",
      account_id: "a1",
      category_id: "c1",
      amount_cents: 1200,
      date: "2026-02-28",
      merchant: null,
      note: null,
      archived_at: null,
      created_at: "2026-02-28T10:00:00Z",
      updated_at: "2026-02-28T10:00:00Z"
    });
    renderShellAt(375);

    fireEvent.click(screen.getByRole("button", { name: "Create transaction" }));
    const dialog = screen.getByRole("dialog");
    await within(dialog).findByRole("heading", { name: "Create transaction" });
    await waitFor(() => {
      expect(within(dialog).getByRole("option", { name: "Main" })).toBeInTheDocument();
      expect(within(dialog).getByRole("option", { name: "Food" })).toBeInTheDocument();
    });

    fireEvent.change(within(dialog).getByLabelText("Account"), { target: { value: "a1" } });
    fireEvent.change(within(dialog).getByLabelText("Category"), { target: { value: "c1" } });
    fireEvent.change(within(dialog).getByLabelText("Amount"), { target: { value: "12.00" } });
    fireEvent.change(within(dialog).getByLabelText("Date", { selector: "input" }), { target: { value: "2026-02-28" } });

    fireEvent.click(within(dialog).getByRole("button", { name: "Create transaction" }));

    await waitFor(() => {
      expect(createTransaction).toHaveBeenCalledTimes(1);
    });
    expect(publishSuccessToast).toHaveBeenCalledWith("Your transaction was saved successfully.");
  });

  it("reuses warm options cache when reopening quick transaction modal", async () => {
    setupModalDataMocks();
    renderShellAt(375);

    fireEvent.click(screen.getByRole("button", { name: "Create transaction" }));
    await screen.findByRole("heading", { name: "Create transaction" });
    await waitFor(() => {
      expect(within(screen.getByRole("dialog")).getByRole("option", { name: "Main" })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: "Create transaction" }));
    await screen.findByRole("heading", { name: "Create transaction" });

    expect(listAccounts).toHaveBeenCalledTimes(1);
    expect(listCategories).toHaveBeenCalledTimes(1);
    expect(listIncomeSources).toHaveBeenCalledTimes(1);
  });

  it("blocks quick transaction submit when amount input is invalid", async () => {
    setupModalDataMocks();
    renderShellAt(375);

    fireEvent.click(screen.getByRole("button", { name: "Create transaction" }));
    await screen.findByRole("heading", { name: "Create transaction" });

    fireEvent.change(screen.getByLabelText("Account"), { target: { value: "a1" } });
    fireEvent.change(screen.getByLabelText("Category"), { target: { value: "c1" } });
    fireEvent.change(screen.getByLabelText("Amount"), { target: { value: "1.999" } });
    fireEvent.change(screen.getByLabelText("Date", { selector: "input" }), { target: { value: "2026-02-28" } });
    fireEvent.click(screen.getByRole("button", { name: "Create transaction" }));

    await waitFor(() => expect(createTransaction).not.toHaveBeenCalled());
  });

  it("clears stale quick transaction form error after option queries recover", async () => {
    vi.mocked(listAccounts)
      .mockRejectedValueOnce(
        new ApiProblemError(403, {
          type: "https://api.budgetbuddy.dev/problems/forbidden",
          title: "Forbidden",
          status: 403,
          detail: "Not allowed"
        })
      )
      .mockResolvedValue({
        items: [{ id: "a1", name: "Main", type: "cash", initial_balance_cents: 0, archived_at: null }],
        next_cursor: null
      });
    vi.mocked(listCategories).mockResolvedValue({
      items: [{ id: "c1", name: "Food", type: "expense", archived_at: null }],
      next_cursor: null
    });
    vi.mocked(listIncomeSources).mockResolvedValue({ items: [] });

    renderShellAt(375);
    fireEvent.click(screen.getByRole("button", { name: "Create transaction" }));
    expect(await screen.findByText("You do not have access to this resource.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: "Create transaction" }));
    await screen.findByRole("heading", { name: "Create transaction" });
    await waitFor(() => {
      expect(screen.queryByText("You do not have access to this resource.")).not.toBeInTheDocument();
    });
  });

  it("submits quick income transaction with selected income source", async () => {
    vi.mocked(listAccounts).mockResolvedValue({
      items: [{ id: "a1", name: "Main", type: "cash", initial_balance_cents: 0, archived_at: null }],
      next_cursor: null
    });
    vi.mocked(listCategories).mockResolvedValue({
      items: [{ id: "c2", name: "Salary", type: "income", archived_at: null }],
      next_cursor: null
    });
    vi.mocked(listIncomeSources).mockResolvedValue({
      items: [
        {
          id: "s1",
          name: "Paycheck 1",
          expected_amount_cents: 250000,
          frequency: "monthly",
          is_active: true,
          note: null,
          archived_at: null,
          created_at: "2026-01-01T00:00:00Z",
          updated_at: "2026-01-01T00:00:00Z"
        }
      ]
    });
    vi.mocked(createTransaction).mockResolvedValue({
      id: "tx-2",
      type: "income",
      account_id: "a1",
      category_id: "c2",
      amount_cents: 200000,
      income_source_id: "s1",
      date: "2026-02-28",
      merchant: null,
      note: null,
      archived_at: null,
      created_at: "2026-02-28T10:00:00Z",
      updated_at: "2026-02-28T10:00:00Z"
    });

    renderShellAt(375);
    fireEvent.click(screen.getByRole("button", { name: "Create transaction" }));
    await screen.findByRole("heading", { name: "Create transaction" });

    fireEvent.change(screen.getByLabelText("Type"), { target: { value: "income" } });
    fireEvent.change(screen.getByLabelText("Account"), { target: { value: "a1" } });
    fireEvent.change(screen.getByLabelText("Category"), { target: { value: "c2" } });
    fireEvent.change(screen.getByLabelText("Income source"), { target: { value: "s1" } });
    fireEvent.change(screen.getByLabelText("Amount"), { target: { value: "2000.00" } });
    fireEvent.change(screen.getByLabelText("Date", { selector: "input" }), { target: { value: "2026-02-28" } });
    fireEvent.click(screen.getByRole("button", { name: "Create transaction" }));

    await waitFor(() =>
      expect(createTransaction).toHaveBeenCalledWith(
        apiClientStub,
        expect.objectContaining({
          type: "income",
          income_source_id: "s1",
          amount_cents: 200000
        })
      )
    );
  });

  it("renders transactions route under RequireAuth and AppShell", async () => {
    renderWithQueryClient(
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
        <MemoryRouter initialEntries={["/app/transactions"]}>
          <Routes>
            <Route
              path="/app"
              element={(
                <RequireAuth>
                  <AppShell />
                </RequireAuth>
              )}
            >
              <Route path="transactions" element={<div>Transactions content</div>} />
            </Route>
            <Route path="/login" element={<div>Login page</div>} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>
    );

    expect(await screen.findByText("Transactions content")).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Main" })).toBeInTheDocument();
  });

  it("renders budgets route under RequireAuth and AppShell", async () => {
    renderWithQueryClient(
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
        <MemoryRouter initialEntries={["/app/budgets"]}>
          <Routes>
            <Route
              path="/app"
              element={(
                <RequireAuth>
                  <AppShell />
                </RequireAuth>
              )}
            >
              <Route path="budgets" element={<div>Budgets content</div>} />
            </Route>
            <Route path="/login" element={<div>Login page</div>} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>
    );

    expect(await screen.findByText("Budgets content")).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Main" })).toBeInTheDocument();
  });

  it("renders analytics route under RequireAuth and AppShell", async () => {
    renderWithQueryClient(
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
        <MemoryRouter initialEntries={["/app/analytics"]}>
          <Routes>
            <Route
              path="/app"
              element={(
                <RequireAuth>
                  <AppShell />
                </RequireAuth>
              )}
            >
              <Route path="analytics" element={<div>Analytics content</div>} />
            </Route>
            <Route path="/login" element={<div>Login page</div>} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>
    );

    expect(await screen.findByText("Analytics content")).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Main" })).toBeInTheDocument();
  });

  it("renders import route under RequireAuth and AppShell", async () => {
    renderWithQueryClient(
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
        <MemoryRouter initialEntries={["/app/transactions/import"]}>
          <Routes>
            <Route
              path="/app"
              element={(
                <RequireAuth>
                  <AppShell />
                </RequireAuth>
              )}
            >
              <Route path="transactions/import" element={<div>Import content</div>} />
            </Route>
            <Route path="/login" element={<div>Login page</div>} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>
    );

    expect(await screen.findByText("Import content")).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Main" })).toBeInTheDocument();
  });

  it("renders savings route under RequireAuth and AppShell", async () => {
    renderWithQueryClient(
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
        <MemoryRouter initialEntries={["/app/savings"]}>
          <Routes>
            <Route
              path="/app"
              element={(
                <RequireAuth>
                  <AppShell />
                </RequireAuth>
              )}
            >
              <Route path="savings" element={<div>Savings content</div>} />
            </Route>
            <Route path="/login" element={<div>Login page</div>} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>
    );

    expect(await screen.findByText("Savings content")).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Main" })).toBeInTheDocument();
  });
});
