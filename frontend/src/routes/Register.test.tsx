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

import Register from "@/routes/Register";

const apiClientStub = {} as ApiClient;

function renderRegister({
  register = async () => undefined,
  isAuthenticated = false,
  user = null as { id: string; username: string; currency_code: string } | null,
  accessToken = null as string | null
}: {
  register?: (username: string, password: string, currencyCode: string) => Promise<void>;
  isAuthenticated?: boolean;
  user?: { id: string; username: string; currency_code: string } | null;
  accessToken?: string | null;
} = {}) {
  return render(
    <AuthContext.Provider
      value={{
        apiClient: apiClientStub,
        user,
        accessToken,
        isAuthenticated,
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
}

describe("Register route", () => {
  beforeEach(() => {
    vi.useRealTimers();
    Object.defineProperty(window.navigator, "onLine", {
      configurable: true,
      value: true
    });
  });

  it("uses shared form components and autofocuses username", async () => {
    renderRegister();

    const username = await screen.findByPlaceholderText("Username");
    expect(username).toHaveFocus();
    expect(username).toHaveClass("bg-transparent");

    const toggles = screen.getAllByRole("button", { name: "Show password" });
    expect(toggles).toHaveLength(2);
    expect(screen.getByRole("combobox")).toBeInTheDocument();
  });

  it("redirects immediately when user is present", async () => {
    renderRegister({
      user: { id: "u1", username: "demo", currency_code: "USD" },
      isAuthenticated: true
    });

    expect(await screen.findByText("Dashboard target")).toBeInTheDocument();
    expect(screen.queryByPlaceholderText("Username")).not.toBeInTheDocument();
  });

  it("redirects with cached user even when access token is null", async () => {
    renderRegister({
      user: { id: "u-cache", username: "cached", currency_code: "USD" },
      accessToken: null,
      isAuthenticated: false
    });

    expect(await screen.findByText("Dashboard target")).toBeInTheDocument();
    expect(screen.queryByPlaceholderText("Username")).not.toBeInTheDocument();
  });

  it("renders form when user is null", async () => {
    renderRegister({
      user: null,
      isAuthenticated: false
    });

    expect(await screen.findByPlaceholderText("Username")).toBeInTheDocument();
  });

  it("keeps password toggles independent", async () => {
    renderRegister();

    const password = await screen.findByPlaceholderText("Password");
    const confirmPassword = screen.getByPlaceholderText("Confirm password");
    const [firstToggle] = screen.getAllByRole("button", { name: "Show password" });

    fireEvent.click(firstToggle);

    expect(password).toHaveAttribute("type", "text");
    expect(confirmPassword).toHaveAttribute("type", "password");
  });

  it("blocks submit with short username before calling api", async () => {
    const register = vi.fn(async () => undefined);
    renderRegister({ register });

    fireEvent.change(await screen.findByPlaceholderText("Username"), { target: { value: "ab" } });
    fireEvent.change(screen.getByPlaceholderText("Password"), { target: { value: "Secret1!" } });
    fireEvent.change(screen.getByPlaceholderText("Confirm password"), { target: { value: "Secret1!" } });
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));

    expect(await screen.findByText("Username must be at least 3 characters.")).toBeInTheDocument();
    expect(register).not.toHaveBeenCalled();
  });

  it("blocks submit with short password before calling api", async () => {
    const register = vi.fn(async () => undefined);
    renderRegister({ register });

    fireEvent.change(await screen.findByPlaceholderText("Username"), { target: { value: "demo" } });
    fireEvent.change(screen.getByPlaceholderText("Password"), { target: { value: "1234567" } });
    fireEvent.change(screen.getByPlaceholderText("Confirm password"), { target: { value: "1234567" } });
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));

    expect(await screen.findByText("Password must be at least 8 characters and include uppercase, lowercase, number, and special character.")).toBeInTheDocument();
    expect(register).not.toHaveBeenCalled();
  });

  it("blocks submit when passwords do not match before calling api", async () => {
    const register = vi.fn(async () => undefined);
    renderRegister({ register });

    fireEvent.change(await screen.findByPlaceholderText("Username"), { target: { value: "demo" } });
    fireEvent.change(screen.getByPlaceholderText("Password"), { target: { value: "Secret1!" } });
    fireEvent.change(screen.getByPlaceholderText("Confirm password"), { target: { value: "different" } });
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));

    expect(await screen.findByText("Passwords do not match.")).toBeInTheDocument();
    expect(register).not.toHaveBeenCalled();
  });

  it("shows backend friendly password validation message", async () => {
    const register = vi.fn(async () => {
      throw new ApiProblemError(
        {
          type: "about:blank",
          title: "Invalid request",
          status: 400,
          detail: "password string should have at least 12 characters"
        },
        {
          httpStatus: 400,
          requestId: "req-400",
          retryAfter: null
        }
      );
    });
    renderRegister({ register });

    fireEvent.change(await screen.findByPlaceholderText("Username"), { target: { value: "demo" } });
    fireEvent.change(screen.getByPlaceholderText("Password"), { target: { value: "Secret12!" } });
    fireEvent.change(screen.getByPlaceholderText("Confirm password"), { target: { value: "Secret12!" } });
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));

    expect(await screen.findByText("Validation failed. Check your input and try again. Password must have at least 12 characters.")).toBeInTheDocument();
    expect(register).toHaveBeenCalledTimes(1);
  });

  it("shows conflict message for existing username", async () => {
    const register = vi.fn(async () => {
      throw new ApiProblemError(
        {
          type: "about:blank",
          title: "Conflict",
          status: 409,
          detail: "Username already exists"
        },
        {
          httpStatus: 409,
          requestId: "req-409",
          retryAfter: null
        }
      );
    });
    renderRegister({ register });

    fireEvent.change(await screen.findByPlaceholderText("Username"), { target: { value: "demo" } });
    fireEvent.change(screen.getByPlaceholderText("Password"), { target: { value: "Secret1!" } });
    fireEvent.change(screen.getByPlaceholderText("Confirm password"), { target: { value: "Secret1!" } });
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));

    expect(await screen.findByText("Username already exists. Try another one.")).toBeInTheDocument();
  });

  it("handles 429 countdown and re-enables submit", async () => {
    const register = vi.fn(async () => {
      throw new ApiProblemError(
        {
          type: "https://api.budgetbuddy.dev/problems/rate-limited",
          title: "Rate limited",
          status: 429
        },
        {
          httpStatus: 429,
          requestId: "req-429",
          retryAfter: "1"
        }
      );
    });
    renderRegister({ register });

    fireEvent.change(await screen.findByPlaceholderText("Username"), { target: { value: "demo" } });
    fireEvent.change(screen.getByPlaceholderText("Password"), { target: { value: "Secret1!" } });
    fireEvent.change(screen.getByPlaceholderText("Confirm password"), { target: { value: "Secret1!" } });
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));

    expect(await screen.findByRole("button", { name: "Retry in 1s" })).toBeDisabled();
    await waitFor(() => expect(screen.getByRole("button", { name: "Create account" })).toBeEnabled(), { timeout: 3000 });
  });

  it("shows offline and 503 retry paths", async () => {
    Object.defineProperty(window.navigator, "onLine", {
      configurable: true,
      value: false
    });
    const register = vi.fn(async () => {
      throw new Error("network");
    });
    renderRegister({ register });

    fireEvent.change(await screen.findByPlaceholderText("Username"), { target: { value: "demo" } });
    fireEvent.change(screen.getByPlaceholderText("Password"), { target: { value: "Secret1!" } });
    fireEvent.change(screen.getByPlaceholderText("Confirm password"), { target: { value: "Secret1!" } });
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));
    expect(await screen.findByText("No internet connection.")).toBeInTheDocument();
  });

  it("shows 503 message and retries with dedicated button", async () => {
    const register = vi
      .fn()
      .mockRejectedValueOnce(
        new ApiProblemError(
          {
            type: "about:blank",
            title: "Unavailable",
            status: 503
          },
          {
            httpStatus: 503,
            requestId: "req-503",
            retryAfter: null
          }
        )
      )
      .mockResolvedValueOnce(undefined);
    renderRegister({ register });

    fireEvent.change(await screen.findByPlaceholderText("Username"), { target: { value: "demo" } });
    fireEvent.change(screen.getByPlaceholderText("Password"), { target: { value: "Secret1!" } });
    fireEvent.change(screen.getByPlaceholderText("Confirm password"), { target: { value: "Secret1!" } });
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));

    expect(await screen.findByText("Server unavailable.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    await waitFor(() => expect(register).toHaveBeenCalledTimes(2));
  });

  it("prioritizes submitting label over retry countdown semantics on retry", async () => {
    let resolveSecond: ((value: void | PromiseLike<void>) => void) | undefined;
    const register = vi
      .fn()
      .mockRejectedValueOnce(
        new ApiProblemError(
          {
            type: "about:blank",
            title: "Unavailable",
            status: 503
          },
          {
            httpStatus: 503,
            requestId: "req-503",
            retryAfter: null
          }
        )
      )
      .mockImplementationOnce(
        () =>
          new Promise<void>((resolve) => {
            resolveSecond = resolve;
          })
      );
    renderRegister({ register });

    fireEvent.change(await screen.findByPlaceholderText("Username"), { target: { value: "demo" } });
    fireEvent.change(screen.getByPlaceholderText("Password"), { target: { value: "Secret1!" } });
    fireEvent.change(screen.getByPlaceholderText("Confirm password"), { target: { value: "Secret1!" } });
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));
    expect(await screen.findByText("Server unavailable.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByRole("button", { name: "Creating account..." })).toBeDisabled();

    resolveSecond?.(undefined);
    await waitFor(() => expect(register).toHaveBeenCalledTimes(2));
  });

  it("clears visible errors when user types", async () => {
    const register = vi.fn(async () => {
      throw new ApiProblemError(
        {
          type: "about:blank",
          title: "Conflict",
          status: 409,
          detail: "Username already exists"
        },
        {
          httpStatus: 409,
          requestId: "req-409",
          retryAfter: null
        }
      );
    });
    renderRegister({ register });

    fireEvent.change(await screen.findByPlaceholderText("Username"), { target: { value: "demo" } });
    fireEvent.change(screen.getByPlaceholderText("Password"), { target: { value: "Secret1!" } });
    fireEvent.change(screen.getByPlaceholderText("Confirm password"), { target: { value: "Secret1!" } });
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));
    expect(await screen.findByText("Username already exists. Try another one.")).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText("Username"), { target: { value: "demo2" } });
    await waitFor(() => {
      expect(screen.queryByText("Username already exists. Try another one.")).not.toBeInTheDocument();
    });
  });
});
