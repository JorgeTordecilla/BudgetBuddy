import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import type { ApiClient } from "@/api/client";
import { AuthContext } from "@/auth/AuthContext";

vi.mock("@/config", () => ({
  API_BASE_URL: "http://internal.example/api",
  APP_ENV: "production",
  SENTRY_DSN: null
}));

import Login from "@/routes/Login";

const apiClientStub = {} as ApiClient;

describe("Login route", () => {
  it("shows full-screen session loader before bootstrap attempt completes", async () => {
    const bootstrapSession = vi.fn(
      () =>
        new Promise<boolean>(() => undefined)
    );

    render(
      <AuthContext.Provider
        value={{
          apiClient: apiClientStub,
          user: null,
          accessToken: null,
          isAuthenticated: false,
          isBootstrapping: true,
          login: async () => undefined,
          register: async () => undefined,
          logout: async () => undefined,
          bootstrapSession
        }}
      >
        <MemoryRouter initialEntries={["/login"]}>
          <Routes>
            <Route path="/login" element={<Login />} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>
    );

    expect(screen.getByText("Checking existing session...")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Sign in" })).not.toBeInTheDocument();
  });

  it("submits credentials and redirects to protected page", async () => {
    const login = vi.fn(async () => undefined);

    render(
      <AuthContext.Provider
        value={{
          apiClient: apiClientStub,
          user: null,
          accessToken: null,
          isAuthenticated: false,
          isBootstrapping: false,
          login,
          register: async () => undefined,
          logout: async () => undefined,
          bootstrapSession: async () => false
        }}
      >
        <MemoryRouter initialEntries={[{ pathname: "/login", state: { from: { pathname: "/app/dashboard" } } }]}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/app/dashboard" element={<div>Dashboard target</div>} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>
    );

    fireEvent.change(await screen.findByPlaceholderText("Username"), { target: { value: "demo" } });
    fireEvent.change(await screen.findByPlaceholderText("Password"), { target: { value: "secret" } });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => expect(screen.getByText("Dashboard target")).toBeInTheDocument());
    expect(login).toHaveBeenCalledWith("demo", "secret");
  });

  it("redirects immediately when already authenticated", async () => {
    render(
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
        <MemoryRouter initialEntries={["/login"]}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/app/dashboard" element={<div>Dashboard target</div>} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>
    );

    await waitFor(() => expect(screen.getAllByText("Dashboard target").length).toBeGreaterThan(0));
  });

  it("restores session via bootstrap and redirects without asking credentials", async () => {
    const bootstrapSession = vi.fn(async () => true);

    render(
      <AuthContext.Provider
        value={{
          apiClient: apiClientStub,
          user: null,
          accessToken: null,
          isAuthenticated: false,
          isBootstrapping: false,
          login: async () => undefined,
          register: async () => undefined,
          logout: async () => undefined,
          bootstrapSession
        }}
      >
        <MemoryRouter initialEntries={[{ pathname: "/login", state: { from: { pathname: "/app/transactions" } } }]}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/app/dashboard" element={<div>Dashboard target</div>} />
            <Route path="/app/transactions" element={<div>Transactions target</div>} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>
    );

    await waitFor(() => expect(screen.getAllByText("Transactions target").length).toBeGreaterThan(0));
    expect(bootstrapSession).toHaveBeenCalledTimes(1);
  });

  it("does not expose API base in non-development runtime", async () => {
    render(
      <AuthContext.Provider
        value={{
          apiClient: apiClientStub,
          user: null,
          accessToken: null,
          isAuthenticated: false,
          isBootstrapping: false,
          login: async () => undefined,
          register: async () => undefined,
          logout: async () => undefined,
          bootstrapSession: async () => false
        }}
      >
        <MemoryRouter initialEntries={["/login"]}>
          <Routes>
            <Route path="/login" element={<Login />} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>
    );

    expect(await screen.findByText("Welcome to BudgetBuddy")).toBeInTheDocument();
    expect(screen.queryByText(/API base:/)).not.toBeInTheDocument();
  });
});


