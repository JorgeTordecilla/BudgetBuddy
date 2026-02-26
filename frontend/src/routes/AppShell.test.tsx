import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import type { ApiClient } from "@/api/client";
import { AuthContext } from "@/auth/AuthContext";
import AppShell from "@/routes/AppShell";

const apiClientStub = {} as ApiClient;

describe("AppShell", () => {
  it("calls logout and redirects to login", async () => {
    const logout = vi.fn(async () => undefined);
    render(
      <AuthContext.Provider
        value={{
          apiClient: apiClientStub,
          user: { id: "u1", username: "demo", currency_code: "USD" },
          accessToken: "token",
          isAuthenticated: true,
          isBootstrapping: false,
          login: async () => undefined,
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
    render(
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
    expect(screen.getByRole("link", { name: "Categories" })).toHaveAttribute("href", "/app/categories");
  });
});
