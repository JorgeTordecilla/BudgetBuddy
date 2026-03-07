import { act, renderHook, waitFor } from "@testing-library/react";
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
  createApiClient: vi.fn((bindings: {
    setSession: (next: { accessToken: string; user: { id: string; username: string; currency_code: string } }) => void;
    clearSession: () => void;
  }) => ({
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

function createJwt(exp: number, payloadExtras?: Record<string, unknown>): string {
  const toBase64Url = (value: string) =>
    btoa(value)
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/g, "");
  const header = toBase64Url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = toBase64Url(JSON.stringify({ exp, ...payloadExtras }));
  return `${header}.${payload}.signature`;
}

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
    window.localStorage.clear();
    window.sessionStorage.clear();
    mockLogin.mockClear();
    mockRegister.mockClear();
    mockRefresh.mockClear();
    mockMe.mockClear();
    mockLogout.mockClear();
    vi.useRealTimers();
  });

  it("stores session in memory on login", async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    await act(async () => {
      await result.current.login("demo", "secret");
    });
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user?.username).toBe("demo");
  });

  it("skips refresh bootstrap when a token already exists", async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    await act(async () => {
      await result.current.login("demo", "secret");
    });
    const refreshCallsBeforeManualBootstrap = mockRefresh.mock.calls.length;
    const meCallsBeforeManualBootstrap = mockMe.mock.calls.length;

    await act(async () => {
      const restored = await result.current.bootstrapSession();
      expect(restored).toBe(true);
    });

    expect(mockRefresh).toHaveBeenCalledTimes(refreshCallsBeforeManualBootstrap);
    expect(mockMe).toHaveBeenCalledTimes(meCallsBeforeManualBootstrap);
  });

  it("uses cached user during bootstrap before refresh resolves", async () => {
    window.localStorage.setItem(
      "bb_session_user",
      JSON.stringify({ id: "cached-user", username: "cached", currency_code: "USD" })
    );
    let resolveRefresh: ((value: RefreshSession | null) => void) | null = null;
    mockRefresh.mockImplementationOnce(
      () => new Promise<RefreshSession | null>((resolve) => { resolveRefresh = resolve; })
    );

    const { result } = renderHook(() => useAuth(), { wrapper });
    await act(async () => {
      void result.current.bootstrapSession();
    });

    await waitFor(() => {
      expect(result.current.user?.username).toBe("cached");
    });
    expect(result.current.isAuthenticated).toBe(false);

    await act(async () => {
      resolveRefresh?.({
        user: { id: "u1", username: "demo", currency_code: "USD" },
        access_token: "token-2",
        access_token_expires_in: 900
      });
    });
  });

  it("hydrates cached user on initial render before async bootstrap resolves", () => {
    window.localStorage.setItem(
      "bb_session_user",
      JSON.stringify({ id: "cached-user", username: "cached", currency_code: "USD" })
    );
    mockRefresh.mockImplementationOnce(() => new Promise<RefreshSession | null>(() => undefined));

    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.user?.username).toBe("cached");
    expect(result.current.isAuthenticated).toBe(false);
  });

  it("cleans cached user when bootstrap refresh fails", async () => {
    const removeItemSpy = vi.spyOn(Storage.prototype, "removeItem");
    window.localStorage.setItem(
      "bb_session_user",
      JSON.stringify({ id: "cached-user", username: "cached", currency_code: "USD" })
    );
    mockRefresh.mockResolvedValueOnce(null);

    const { result } = renderHook(() => useAuth(), { wrapper });
    await act(async () => {
      const restored = await result.current.bootstrapSession();
      expect(restored).toBe(false);
    });

    expect(removeItemSpy).toHaveBeenCalledWith("bb_session_user");
    expect(result.current.user).toBeNull();
  });

  it("ignores malformed cached user json and continues bootstrap", async () => {
    window.localStorage.setItem("bb_session_user", "{broken json");
    const { result } = renderHook(() => useAuth(), { wrapper });
    await act(async () => {
      const restored = await result.current.bootstrapSession();
      expect(restored).toBe(true);
    });
    expect(mockRefresh).toHaveBeenCalledTimes(1);
    expect(mockMe).toHaveBeenCalledTimes(1);
  });

  it("ignores cached user shape without required id/username fields", async () => {
    window.localStorage.setItem("bb_session_user", JSON.stringify({ id: 1, username: null }));
    const { result } = renderHook(() => useAuth(), { wrapper });
    await act(async () => {
      const restored = await result.current.bootstrapSession();
      expect(restored).toBe(true);
    });
    expect(result.current.user?.username).toBe("demo");
  });

  it("handles storage access errors without interrupting bootstrap", async () => {
    const getItemSpy = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("Denied", "SecurityError");
    });
    const { result } = renderHook(() => useAuth(), { wrapper });
    await act(async () => {
      const restored = await result.current.bootstrapSession();
      expect(restored).toBe(true);
    });
    expect(mockRefresh).toHaveBeenCalledTimes(1);
    getItemSpy.mockRestore();
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

  it("deduplicates concurrent bootstrap calls", async () => {
    let resolveRefresh: ((value: RefreshSession | null) => void) | null = null;
    mockRefresh.mockImplementationOnce(
      () => new Promise<RefreshSession | null>((resolve) => { resolveRefresh = resolve; })
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
  });

  it("handles storage write errors without interrupting state updates", async () => {
    const setItemSpy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("Denied", "SecurityError");
    });
    const { result } = renderHook(() => useAuth(), { wrapper });
    await act(async () => {
      await result.current.login("demo", "secret");
    });
    expect(result.current.isAuthenticated).toBe(true);
    setItemSpy.mockRestore();
  });

  it("schedules silent refresh 60 seconds before token expiration", async () => {
    const nowMs = 1_700_000_000_000;
    vi.useFakeTimers();
    vi.setSystemTime(nowMs);
    const setTimeoutSpy = vi.spyOn(window, "setTimeout");
    const token = createJwt(Math.floor(nowMs / 1000) + 300);
    mockLogin.mockResolvedValueOnce({
      user: { id: "u1", username: "demo", currency_code: "USD" },
      access_token: token,
      access_token_expires_in: 900
    });

    const { result } = renderHook(() => useAuth(), { wrapper });
    await act(async () => {
      await result.current.login("demo", "secret");
    });

    const matchingCall = setTimeoutSpy.mock.calls.find(([, delay]) => delay === 240000);
    expect(matchingCall).toBeTruthy();
  });

  it("does not schedule silent refresh when jwt payload is malformed", async () => {
    vi.useFakeTimers();
    mockLogin.mockResolvedValueOnce({
      user: { id: "u1", username: "demo", currency_code: "USD" },
      access_token: "not-a-jwt",
      access_token_expires_in: 900
    });

    const { result } = renderHook(() => useAuth(), { wrapper });
    await act(async () => {
      await result.current.login("demo", "secret");
    });
    const refreshCallsAfterLogin = mockRefresh.mock.calls.length;

    await act(async () => {
      vi.advanceTimersByTime(600_000);
      await Promise.resolve();
    });

    expect(mockRefresh).toHaveBeenCalledTimes(refreshCallsAfterLogin);
  });

  it("schedules immediate silent refresh when token expires within 60 seconds", async () => {
    const nowMs = 1_700_000_000_000;
    vi.useFakeTimers();
    vi.setSystemTime(nowMs);
    const setTimeoutSpy = vi.spyOn(window, "setTimeout");
    const token = createJwt(Math.floor(nowMs / 1000) + 30);
    mockLogin.mockResolvedValueOnce({
      user: { id: "u1", username: "demo", currency_code: "USD" },
      access_token: token,
      access_token_expires_in: 900
    });

    const { result } = renderHook(() => useAuth(), { wrapper });
    await act(async () => {
      await result.current.login("demo", "secret");
    });

    const matchingCall = setTimeoutSpy.mock.calls.find(([, delay]) => delay === 0);
    expect(matchingCall).toBeTruthy();
  });

  it("cancels silent refresh timer on logout", async () => {
    const nowMs = 1_700_000_000_000;
    vi.useFakeTimers();
    vi.setSystemTime(nowMs);
    const clearTimeoutSpy = vi.spyOn(window, "clearTimeout");
    const token = createJwt(Math.floor(nowMs / 1000) + 300);
    mockLogin.mockResolvedValueOnce({
      user: { id: "u1", username: "demo", currency_code: "USD" },
      access_token: token,
      access_token_expires_in: 900
    });

    const { result } = renderHook(() => useAuth(), { wrapper });
    await act(async () => {
      await result.current.login("demo", "secret");
    });
    await act(async () => {
      await result.current.logout();
    });

    expect(clearTimeoutSpy).toHaveBeenCalled();
  });

  it("handles silent refresh failure without throwing unhandled errors", async () => {
    const nowMs = 1_700_000_000_000;
    vi.useFakeTimers();
    vi.setSystemTime(nowMs);
    const token = createJwt(Math.floor(nowMs / 1000) + 61, { foo: "bar-baz_qux" });
    mockLogin.mockResolvedValueOnce({
      user: { id: "u1", username: "demo", currency_code: "USD" },
      access_token: token,
      access_token_expires_in: 900
    });
    mockRefresh.mockRejectedValueOnce(new Error("silent refresh failed"));

    const { result } = renderHook(() => useAuth(), { wrapper });
    await act(async () => {
      await result.current.login("demo", "secret");
    });

    await act(async () => {
      vi.advanceTimersByTime(1000);
      await Promise.resolve();
    });

    expect(mockRefresh).toHaveBeenCalled();
    expect(result.current.isAuthenticated).toBe(true);
  });
});
