import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import { AuthContext } from "@/auth/AuthContext";
import AppShell from "@/routes/AppShell";

describe("AppShell", () => {
  it("calls logout and redirects to login", async () => {
    const logout = vi.fn(async () => undefined);
    render(
      <AuthContext.Provider
        value={{
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
});

