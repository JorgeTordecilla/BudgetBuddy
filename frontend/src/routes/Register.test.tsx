import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import type { ApiClient } from "@/api/client";
import { ApiProblemError } from "@/api/errors";
import { AuthContext } from "@/auth/AuthContext";

vi.mock("@/config", () => ({
  API_BASE_URL: "http://internal.example/api",
  APP_ENV: "production",
  SENTRY_DSN: null
}));

import Register from "@/routes/Register";

const apiClientStub = {} as ApiClient;

describe("Register route", () => {
  it("submits registration and redirects to dashboard", async () => {
    const register = vi.fn(async () => undefined);

    render(
      <AuthContext.Provider
        value={{
          apiClient: apiClientStub,
          user: null,
          accessToken: null,
          isAuthenticated: false,
          isBootstrapping: false,
          login: async () => undefined,
          register,
          logout: async () => undefined,
          bootstrapSession: async () => false
        }}
      >
        <MemoryRouter initialEntries={["/register"]}>
          <Routes>
            <Route path="/register" element={<Register />} />
            <Route path="/app/dashboard" element={<div>Dashboard target</div>} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>
    );

    fireEvent.change(screen.getByPlaceholderText("Username"), { target: { value: "demo" } });
    fireEvent.change(screen.getByPlaceholderText("Password"), { target: { value: "secret123" } });
    fireEvent.change(screen.getByPlaceholderText("Confirm password"), { target: { value: "secret123" } });
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "COP" } });
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));

    await waitFor(() => expect(screen.getByText("Dashboard target")).toBeInTheDocument());
    expect(register).toHaveBeenCalledWith("demo", "secret123", "COP");
  });

  it("redirects to intended protected path from location state after register", async () => {
    const register = vi.fn(async () => undefined);

    render(
      <AuthContext.Provider
        value={{
          apiClient: apiClientStub,
          user: null,
          accessToken: null,
          isAuthenticated: false,
          isBootstrapping: false,
          login: async () => undefined,
          register,
          logout: async () => undefined,
          bootstrapSession: async () => false
        }}
      >
        <MemoryRouter initialEntries={[{ pathname: "/register", state: { from: { pathname: "/app/transactions" } } }]}>
          <Routes>
            <Route path="/register" element={<Register />} />
            <Route path="/app/transactions" element={<div>Transactions target</div>} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>
    );

    fireEvent.change(screen.getByPlaceholderText("Username"), { target: { value: "demo" } });
    fireEvent.change(screen.getByPlaceholderText("Password"), { target: { value: "secret123" } });
    fireEvent.change(screen.getByPlaceholderText("Confirm password"), { target: { value: "secret123" } });
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));

    await waitFor(() => expect(screen.getByText("Transactions target")).toBeInTheDocument());
  });

  it("shows validation error when passwords do not match", async () => {
    const register = vi.fn(async () => undefined);

    render(
      <AuthContext.Provider
        value={{
          apiClient: apiClientStub,
          user: null,
          accessToken: null,
          isAuthenticated: false,
          isBootstrapping: false,
          login: async () => undefined,
          register,
          logout: async () => undefined,
          bootstrapSession: async () => false
        }}
      >
        <MemoryRouter initialEntries={["/register"]}>
          <Routes>
            <Route path="/register" element={<Register />} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>
    );

    fireEvent.change(screen.getByPlaceholderText("Username"), { target: { value: "demo" } });
    fireEvent.change(screen.getByPlaceholderText("Password"), { target: { value: "secret123" } });
    fireEvent.change(screen.getByPlaceholderText("Confirm password"), { target: { value: "different" } });
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));

    expect(await screen.findByText("Passwords do not match.")).toBeInTheDocument();
    expect(register).not.toHaveBeenCalled();
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
        <MemoryRouter initialEntries={["/register"]}>
          <Routes>
            <Route path="/register" element={<Register />} />
            <Route path="/app/dashboard" element={<div>Dashboard target</div>} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>
    );

    await waitFor(() => expect(screen.getByText("Dashboard target")).toBeInTheDocument());
  });

  it("falls back to dashboard when state.from is not a protected app path", async () => {
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
        <MemoryRouter initialEntries={[{ pathname: "/register", state: { from: { pathname: "/login" } } }]}>
          <Routes>
            <Route path="/register" element={<Register />} />
            <Route path="/app/dashboard" element={<div>Dashboard target</div>} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>
    );

    await waitFor(() => expect(screen.getByText("Dashboard target")).toBeInTheDocument());
  });

  it("shows safe message for backend 400 invalid payload", async () => {
    const register = vi.fn(async () => {
      throw new ApiProblemError(
        {
          type: "https://api.budgetbuddy.dev/problems/invalid-request",
          title: "Invalid request",
          status: 400,
          detail: "Payload did not pass validation."
        },
        {
          httpStatus: 400,
          requestId: "req-400",
          retryAfter: null
        }
      );
    });

    render(
      <AuthContext.Provider
        value={{
          apiClient: apiClientStub,
          user: null,
          accessToken: null,
          isAuthenticated: false,
          isBootstrapping: false,
          login: async () => undefined,
          register,
          logout: async () => undefined,
          bootstrapSession: async () => false
        }}
      >
        <MemoryRouter initialEntries={["/register"]}>
          <Routes>
            <Route path="/register" element={<Register />} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>
    );

    fireEvent.change(screen.getByPlaceholderText("Username"), { target: { value: "demo" } });
    fireEvent.change(screen.getByPlaceholderText("Password"), { target: { value: "secret123" } });
    fireEvent.change(screen.getByPlaceholderText("Confirm password"), { target: { value: "secret123" } });
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));

    expect(await screen.findByText("Unexpected error. Please retry.")).toBeInTheDocument();
  });

  it("renders mapped api problem message", async () => {
    const register = vi.fn(async () => {
      throw new ApiProblemError(
        {
          type: "https://api.budgetbuddy.dev/problems/unauthorized",
          title: "Unauthorized",
          status: 401
        },
        {
          httpStatus: 401,
          requestId: "req-123",
          retryAfter: null
        }
      );
    });

    render(
      <AuthContext.Provider
        value={{
          apiClient: apiClientStub,
          user: null,
          accessToken: null,
          isAuthenticated: false,
          isBootstrapping: false,
          login: async () => undefined,
          register,
          logout: async () => undefined,
          bootstrapSession: async () => false
        }}
      >
        <MemoryRouter initialEntries={["/register"]}>
          <Routes>
            <Route path="/register" element={<Register />} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>
    );

    fireEvent.change(screen.getByPlaceholderText("Username"), { target: { value: "demo" } });
    fireEvent.change(screen.getByPlaceholderText("Password"), { target: { value: "secret123" } });
    fireEvent.change(screen.getByPlaceholderText("Confirm password"), { target: { value: "secret123" } });
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));

    expect(await screen.findByText("Your session expired. Please sign in again.")).toBeInTheDocument();
  });
});
