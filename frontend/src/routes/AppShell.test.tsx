import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactElement } from "react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import type { ApiClient } from "@/api/client";
import { AuthContext } from "@/auth/AuthContext";
import { listAccounts } from "@/api/accounts";
import { listCategories } from "@/api/categories";
import { createTransaction } from "@/api/transactions";
import { publishSuccessToast } from "@/components/feedback/successToastStore";
import AppShell from "@/routes/AppShell";
import RequireAuth from "@/routes/RequireAuth";

vi.mock("@/api/accounts", () => ({ listAccounts: vi.fn() }));
vi.mock("@/api/categories", () => ({ listCategories: vi.fn() }));
vi.mock("@/api/transactions", () => ({ createTransaction: vi.fn() }));
vi.mock("@/components/feedback/successToastStore", () => ({ publishSuccessToast: vi.fn() }));

const apiClientStub = {} as ApiClient;

describe("AppShell", () => {
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
    expect(screen.getByRole("link", { name: "Budgets" })).toHaveAttribute("href", "/app/budgets");
    expect(screen.getByRole("link", { name: "Transactions" })).toHaveAttribute("href", "/app/transactions");
  });

  it("keeps primary navigation accessible on mobile width", () => {
    setupModalDataMocks();
    renderShellAt(375);
    expect(screen.getByRole("navigation", { name: "Main" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Dashboard" })).toBeInTheDocument();
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
    await screen.findByRole("heading", { name: "Create transaction" });

    fireEvent.change(screen.getByLabelText("Account"), { target: { value: "a1" } });
    fireEvent.change(screen.getByLabelText("Category"), { target: { value: "c1" } });
    fireEvent.change(screen.getByLabelText("Amount (cents)"), { target: { value: "1200" } });
    fireEvent.change(screen.getByLabelText("Date"), { target: { value: "2026-02-28" } });

    fireEvent.click(screen.getAllByRole("button", { name: "Create transaction" })[1]);

    await waitFor(() => {
      expect(createTransaction).toHaveBeenCalledTimes(1);
    });
    expect(publishSuccessToast).toHaveBeenCalledWith("Your transaction was saved successfully.");
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
});


