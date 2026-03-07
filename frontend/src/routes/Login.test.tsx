import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ApiClient } from "@/api/client";
import { ApiProblemError } from "@/api/errors";
import { AuthContext } from "@/auth/AuthContext";

vi.mock("@/config", () => ({
  API_BASE_URL: "http://internal.example/api",
  APP_ENV: "production",
  SENTRY_DSN: null
}));

import Login from "@/routes/Login";

const apiClientStub = {} as ApiClient;

function renderLogin({
  login = async () => undefined,
  isAuthenticated = false,
  isBootstrapping = false,
  user = null as { id: string; username: string; currency_code: string } | null,
  accessToken = null as string | null,
  bootstrapSession = async () => false
} = {}) {
  return render(
    <AuthContext.Provider
      value={{
        apiClient: apiClientStub,
        user,
        accessToken,
        isAuthenticated,
        isBootstrapping,
        login,
        register: async () => undefined,
        logout: async () => undefined,
        bootstrapSession
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
}

describe("Login route", () => {
  beforeEach(() => {
    vi.useRealTimers();
    Object.defineProperty(window.navigator, "onLine", {
      configurable: true,
      value: true
    });
  });

  it("uses shared Input/PasswordInput and autofocuses username", async () => {
    renderLogin();

    const username = await screen.findByPlaceholderText("Username");
    expect(username).toHaveFocus();
    expect(username).toHaveClass("bg-transparent");

    const showPasswordButton = screen.getByRole("button", { name: "Show password" });
    expect(showPasswordButton).toBeInTheDocument();
  });

  it("redirects immediately when user is present while bootstrapping", async () => {
    renderLogin({
      user: { id: "u1", username: "demo", currency_code: "USD" },
      isBootstrapping: true,
      bootstrapSession: async () => false
    });

    expect(screen.queryByText("Checking existing session...")).not.toBeInTheDocument();
    expect(await screen.findByText("Dashboard target")).toBeInTheDocument();
    expect(screen.queryByPlaceholderText("Username")).not.toBeInTheDocument();
  });

  it("redirects immediately with cached user even without access token", async () => {
    renderLogin({
      user: { id: "u-cache", username: "cached", currency_code: "USD" },
      accessToken: null,
      isAuthenticated: false
    });

    expect(await screen.findByText("Dashboard target")).toBeInTheDocument();
    expect(screen.queryByPlaceholderText("Username")).not.toBeInTheDocument();
  });

  it("shows session loader when user is null and bootstrap is in progress", () => {
    renderLogin({
      user: null,
      isBootstrapping: true,
      isAuthenticated: false
    });

    expect(screen.getByText("Checking existing session...")).toBeInTheDocument();
    expect(screen.queryByPlaceholderText("Username")).not.toBeInTheDocument();
  });

  it("submits credentials and redirects to protected page", async () => {
    const login = vi.fn(async () => undefined);
    renderLogin({ login });

    fireEvent.change(await screen.findByPlaceholderText("Username"), { target: { value: "demo" } });
    fireEvent.change(screen.getByPlaceholderText("Password"), { target: { value: "Secret1!" } });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => expect(screen.getByText("Dashboard target")).toBeInTheDocument());
    expect(login).toHaveBeenCalledWith("demo", "Secret1!");
  });

  it("blocks submit with short password before calling api", async () => {
    const login = vi.fn(async () => undefined);
    renderLogin({ login });

    fireEvent.change(await screen.findByPlaceholderText("Username"), { target: { value: "demo" } });
    fireEvent.change(screen.getByPlaceholderText("Password"), { target: { value: "short" } });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByText("Password must be at least 8 characters and include uppercase, lowercase, number, and special character.")).toBeInTheDocument();
    expect(login).not.toHaveBeenCalled();
  });

  it("shows canonical message for 401 errors", async () => {
    const login = vi.fn(async () => {
      throw new ApiProblemError(
        {
          type: "https://api.budgetbuddy.dev/problems/unauthorized",
          title: "Unauthorized",
          status: 401
        },
        { httpStatus: 401, requestId: "req-401", retryAfter: null }
      );
    });
    renderLogin({ login });

    fireEvent.change(await screen.findByPlaceholderText("Username"), { target: { value: "demo" } });
    fireEvent.change(screen.getByPlaceholderText("Password"), { target: { value: "Wrongpass1!" } });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByText("Invalid credentials. Please try again.")).toBeInTheDocument();
  });

  it("shows offline message when navigator is offline", async () => {
    Object.defineProperty(window.navigator, "onLine", {
      configurable: true,
      value: false
    });
    const login = vi.fn(async () => {
      throw new Error("network");
    });
    renderLogin({ login });

    fireEvent.change(await screen.findByPlaceholderText("Username"), { target: { value: "demo" } });
    fireEvent.change(screen.getByPlaceholderText("Password"), { target: { value: "Secret1!" } });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByText("No internet connection.")).toBeInTheDocument();
  });

  it("handles 429 retry-after countdown and re-enables submit", async () => {
    const login = vi.fn(async () => {
      throw new ApiProblemError(
        {
          type: "https://api.budgetbuddy.dev/problems/rate-limited",
          title: "Rate limited",
          status: 429
        },
        { httpStatus: 429, requestId: "req-429", retryAfter: "1" }
      );
    });
    renderLogin({ login });

    fireEvent.change(await screen.findByPlaceholderText("Username"), { target: { value: "demo" } });
    fireEvent.change(screen.getByPlaceholderText("Password"), { target: { value: "Secret1!" } });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByRole("button", { name: "Retry in 1s" })).toBeDisabled();
    await waitFor(() => expect(screen.getByRole("button", { name: "Sign in" })).toBeEnabled(), { timeout: 3000 });
  });

  it("shows 503 message and retries with dedicated button", async () => {
    const login = vi
      .fn()
      .mockRejectedValueOnce(
        new ApiProblemError(
          {
            type: "about:blank",
            title: "Unavailable",
            status: 503
          },
          { httpStatus: 503, requestId: "req-503", retryAfter: null }
        )
      )
      .mockResolvedValueOnce(undefined);
    renderLogin({ login });

    fireEvent.change(await screen.findByPlaceholderText("Username"), { target: { value: "demo" } });
    fireEvent.change(screen.getByPlaceholderText("Password"), { target: { value: "Secret1!" } });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByText("Server unavailable.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));

    await waitFor(() => expect(login).toHaveBeenCalledTimes(2));
  });

  it("prioritizes submitting label over retry countdown semantics on retry", async () => {
    let resolveSecond: ((value: void | PromiseLike<void>) => void) | undefined;
    const login = vi
      .fn()
      .mockRejectedValueOnce(
        new ApiProblemError(
          {
            type: "about:blank",
            title: "Unavailable",
            status: 503
          },
          { httpStatus: 503, requestId: "req-503", retryAfter: null }
        )
      )
      .mockImplementationOnce(
        () =>
          new Promise<void>((resolve) => {
            resolveSecond = resolve;
          })
      );
    renderLogin({ login });

    fireEvent.change(await screen.findByPlaceholderText("Username"), { target: { value: "demo" } });
    fireEvent.change(screen.getByPlaceholderText("Password"), { target: { value: "Secret1!" } });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByText("Server unavailable.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByRole("button", { name: "Signing in..." })).toBeDisabled();

    resolveSecond?.(undefined);
    await waitFor(() => expect(login).toHaveBeenCalledTimes(2));
  });

  it("clears errors when typing", async () => {
    const login = vi.fn(async () => {
      throw new ApiProblemError(
        {
          type: "https://api.budgetbuddy.dev/problems/unauthorized",
          title: "Unauthorized",
          status: 401
        },
        { httpStatus: 401, requestId: "req-401", retryAfter: null }
      );
    });
    renderLogin({ login });

    fireEvent.change(await screen.findByPlaceholderText("Username"), { target: { value: "demo" } });
    fireEvent.change(screen.getByPlaceholderText("Password"), { target: { value: "Wrongpass1!" } });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByText("Invalid credentials. Please try again.")).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText("Username"), { target: { value: "demo2" } });
    await waitFor(() => {
      expect(screen.queryByText("Invalid credentials. Please try again.")).not.toBeInTheDocument();
    });
  });
});
