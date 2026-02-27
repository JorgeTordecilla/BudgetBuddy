import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import type { ApiClient } from "@/api/client";
import { AuthContext } from "@/auth/AuthContext";
import RequireAuth from "@/routes/RequireAuth";

const apiClientStub = {} as ApiClient;

function renderWithAuth(value: Parameters<typeof AuthContext.Provider>[0]["value"]) {
  return render(
    <AuthContext.Provider value={value}>
      <MemoryRouter initialEntries={["/app"]}>
        <Routes>
          <Route
            path="/app"
            element={
              <RequireAuth>
                <div>Private area</div>
              </RequireAuth>
            }
          />
          <Route path="/login" element={<div>Login page</div>} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>
  );
}

describe("RequireAuth", () => {
  it("shows loader while auth bootstrap is in progress", () => {
    renderWithAuth({
      apiClient: apiClientStub,
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isBootstrapping: true,
      login: async () => undefined,
      logout: async () => undefined,
      bootstrapSession: async () => false
    });
    expect(screen.getByText("Checking session...")).toBeInTheDocument();
  });

  it("renders protected content when authenticated", () => {
    renderWithAuth({
      apiClient: apiClientStub,
      user: { id: "u1", username: "demo", currency_code: "USD" },
      accessToken: "token",
      isAuthenticated: true,
      isBootstrapping: false,
      login: async () => undefined,
      logout: async () => undefined,
      bootstrapSession: async () => true
    });
    expect(screen.getByText("Private area")).toBeInTheDocument();
  });

  it("redirects to login when bootstrap fails", async () => {
    const bootstrapSession = vi.fn(async () => false);
    renderWithAuth({
      apiClient: apiClientStub,
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isBootstrapping: false,
      login: async () => undefined,
      logout: async () => undefined,
      bootstrapSession
    });
    await waitFor(() => expect(screen.getByText("Login page")).toBeInTheDocument());
    expect(bootstrapSession).toHaveBeenCalledTimes(1);
  });
});
