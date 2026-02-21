import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AuthProvider } from "@/auth/AuthContext";
import { useAuth } from "@/auth/useAuth";

const mockLogin = vi.fn(async () => {
  const user = { id: "u1", username: "demo", currency_code: "USD" };
  return { user, access_token: "token-1", access_token_expires_in: 900 };
});
const mockRefresh = vi.fn(async () => {
  const user = { id: "u1", username: "demo", currency_code: "USD" };
  return { user, access_token: "token-2", access_token_expires_in: 900 };
});
const mockLogout = vi.fn(async () => undefined);

vi.mock("@/api/client", () => ({
  createApiClient: vi.fn((bindings: { setSession: (next: { accessToken: string; user: { id: string; username: string; currency_code: string } }) => void; clearSession: () => void }) => ({
    login: vi.fn(async (...args: [string, string]) => {
      const response = await mockLogin(...args);
      bindings.setSession({ accessToken: response.access_token, user: response.user });
      return response;
    }),
    refresh: vi.fn(async () => {
      const response = await mockRefresh();
      bindings.setSession({ accessToken: response.access_token, user: response.user });
      return response;
    }),
    logout: vi.fn(async () => {
      await mockLogout();
      bindings.clearSession();
    })
  }))
}));

describe("AuthProvider", () => {
  const wrapper = ({ children }: { children: ReactNode }) => <AuthProvider>{children}</AuthProvider>;

  beforeEach(() => {
    mockLogin.mockClear();
    mockRefresh.mockClear();
    mockLogout.mockClear();
  });

  it("stores session in memory on login", async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    await act(async () => {
      await result.current.login("demo", "secret");
    });
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.accessToken).toBe("token-1");
    expect(result.current.user?.username).toBe("demo");
    expect(mockLogin).toHaveBeenCalledTimes(1);
  });

  it("bootstraps from refresh when token is missing", async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    await act(async () => {
      const restored = await result.current.bootstrapSession();
      expect(restored).toBe(true);
    });
    expect(result.current.accessToken).toBe("token-2");
    expect(result.current.isAuthenticated).toBe(true);
    expect(mockRefresh).toHaveBeenCalledTimes(1);
  });

  it("skips refresh bootstrap when a token already exists", async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    await act(async () => {
      await result.current.login("demo", "secret");
    });

    await act(async () => {
      const restored = await result.current.bootstrapSession();
      expect(restored).toBe(true);
    });

    expect(mockRefresh).not.toHaveBeenCalled();
  });

  it("logout clears session state", async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    await act(async () => {
      await result.current.login("demo", "secret");
    });
    await act(async () => {
      await result.current.logout();
    });
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.accessToken).toBeNull();
    expect(mockLogout).toHaveBeenCalledTimes(1);
  });
});

