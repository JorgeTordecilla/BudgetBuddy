import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AuthProvider } from "@/auth/AuthContext";
import { useAuth } from "@/auth/useAuth";

const mockLogin = vi.fn(async (_username: string, _password: string) => {
  const user = { id: "u1", username: "demo", currency_code: "USD" };
  return { user, access_token: "token-1", access_token_expires_in: 900 };
});
const mockRegister = vi.fn(async (_username: string, _password: string, _currencyCode: string) => {
  const user = { id: "u1", username: "demo", currency_code: "COP" };
  return { user, access_token: "token-register", access_token_expires_in: 900 };
});
type RefreshSession = {
  user: { id: string; username: string; currency_code: string };
  access_token: string;
  access_token_expires_in: number;
};
const mockRefresh = vi.fn(async (): Promise<RefreshSession | null> => {
  const user = { id: "u1", username: "demo", currency_code: "USD" };
  return { user, access_token: "token-2", access_token_expires_in: 900 };
});
const mockMe = vi.fn(async () => ({ id: "u1", username: "demo", currency_code: "USD" }));
const mockLogout = vi.fn(async () => undefined);

vi.mock("@/api/client", () => ({
  createApiClient: vi.fn((bindings: { setSession: (next: { accessToken: string; user: { id: string; username: string; currency_code: string } }) => void; clearSession: () => void }) => ({
    login: vi.fn(async (...args: [string, string]) => {
      const response = await mockLogin(...args);
      bindings.setSession({ accessToken: response.access_token, user: response.user });
      return response;
    }),
    register: vi.fn(async (payload: { username: string; password: string; currency_code: string }) => {
      const response = await mockRegister(payload.username, payload.password, payload.currency_code);
      bindings.setSession({ accessToken: response.access_token, user: response.user });
      return response;
    }),
    refresh: vi.fn(async () => {
      const response = await mockRefresh();
      if (response) {
        bindings.setSession({ accessToken: response.access_token, user: response.user });
      }
      return response;
    }),
    me: vi.fn(async () => mockMe()),
    logout: vi.fn(async () => {
      await mockLogout();
      bindings.clearSession();
    })
  }))
}));

describe("AuthProvider", () => {
  const wrapper = ({ children }: { children: ReactNode }) => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    });
    return (
      <QueryClientProvider client={queryClient}>
        <AuthProvider>{children}</AuthProvider>
      </QueryClientProvider>
    );
  };

  beforeEach(() => {
    mockLogin.mockClear();
    mockRegister.mockClear();
    mockRefresh.mockClear();
    mockMe.mockClear();
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

  it("stores session in memory on register", async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    await act(async () => {
      await result.current.register("demo", "secret", "COP");
    });
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.accessToken).toBe("token-register");
    expect(result.current.user?.currency_code).toBe("COP");
    expect(mockRegister).toHaveBeenCalledTimes(1);
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
    expect(mockMe).toHaveBeenCalledTimes(1);
  });

  it("restores session after browser reload using refresh cookie flow", async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      const restored = await result.current.bootstrapSession();
      expect(restored).toBe(true);
    });

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.accessToken).toBe("token-2");
    expect(mockRefresh).toHaveBeenCalledTimes(1);
    expect(mockMe).toHaveBeenCalledTimes(1);
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
    expect(mockMe).not.toHaveBeenCalled();
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

  it("logout clears session state even when api logout fails", async () => {
    mockLogout.mockRejectedValueOnce(new Error("logout_failed"));
    const { result } = renderHook(() => useAuth(), { wrapper });
    await act(async () => {
      await result.current.login("demo", "secret");
    });
    await act(async () => {
      await expect(result.current.logout()).rejects.toThrow("logout_failed");
    });
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.accessToken).toBeNull();
  });

  it("keeps session unauthenticated when bootstrap refresh is unauthorized", async () => {
    mockRefresh.mockResolvedValueOnce(null);
    const { result } = renderHook(() => useAuth(), { wrapper });
    await act(async () => {
      const restored = await result.current.bootstrapSession();
      expect(restored).toBe(false);
    });
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.accessToken).toBeNull();
    expect(result.current.user).toBeNull();
    expect(mockMe).not.toHaveBeenCalled();
  });

  it("does not repeat refresh immediately after unauthorized bootstrap failure", async () => {
    mockRefresh.mockResolvedValue(null);
    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      const first = await result.current.bootstrapSession();
      expect(first).toBe(false);
    });

    await act(async () => {
      const second = await result.current.bootstrapSession();
      expect(second).toBe(false);
    });

    expect(mockRefresh).toHaveBeenCalledTimes(1);
    expect(mockMe).not.toHaveBeenCalled();
  });

  it("does not loop refresh attempts on transient bootstrap failures", async () => {
    mockRefresh.mockRejectedValueOnce(new TypeError("network down"));
    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      const restored = await result.current.bootstrapSession();
      expect(restored).toBe(false);
    });

    expect(mockRefresh).toHaveBeenCalledTimes(1);
    expect(mockMe).not.toHaveBeenCalled();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it("deduplicates concurrent bootstrap calls to avoid repeated refresh requests", async () => {
    let resolveRefresh: ((value: RefreshSession | null) => void) | null = null;
    mockRefresh.mockImplementationOnce(
      () =>
        new Promise<RefreshSession | null>((resolve) => {
          resolveRefresh = resolve;
        })
    );

    const { result } = renderHook(() => useAuth(), { wrapper });

    let first: Promise<boolean>;
    let second: Promise<boolean>;
    await act(async () => {
      first = result.current.bootstrapSession();
      second = result.current.bootstrapSession();
      expect(mockRefresh).toHaveBeenCalledTimes(1);
      resolveRefresh?.({
        user: { id: "u1", username: "demo", currency_code: "USD" },
        access_token: "token-2",
        access_token_expires_in: 900
      });
      await expect(Promise.all([first!, second!])).resolves.toEqual([true, true]);
    });

    expect(mockMe).toHaveBeenCalledTimes(1);
    expect(result.current.isAuthenticated).toBe(true);
  });
});
