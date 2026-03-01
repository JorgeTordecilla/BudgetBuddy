import { beforeEach, describe, expect, it, vi } from "vitest";

const { publishProblemToast } = vi.hoisted(() => ({
  publishProblemToast: vi.fn()
}));
vi.mock("@/components/errors/problemToastStore", () => ({
  publishProblemToast
}));

import { createApiClient } from "@/api/client";
import type { User } from "@/api/types";

function makeUser(): User {
  return { id: "u1", username: "demo", currency_code: "USD" };
}

describe("api client refresh behavior", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    publishProblemToast.mockClear();
    window.dispatchEvent(new Event("pageshow"));
  });

  it("retries once after refresh succeeds", async () => {
    const calls: Array<{ url: string; authorization: string | null }> = [];
    let token = "old-token";
    const setSession = vi.fn(({ accessToken }: { accessToken: string; user: User }) => {
      token = accessToken;
    });
    const clearSession = vi.fn();
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockImplementationOnce(async (input, init) => {
        const headers = new Headers(init?.headers);
        calls.push({ url: String(input), authorization: headers.get("Authorization") });
        return new Response("unauthorized", { status: 401 });
      })
      .mockImplementationOnce(async (input, init) => {
        const headers = new Headers(init?.headers);
        calls.push({ url: String(input), authorization: headers.get("Authorization") });
        return new Response(
          JSON.stringify({
            user: makeUser(),
            access_token: "new-token",
            access_token_expires_in: 900
          }),
          { status: 200, headers: { "content-type": "application/json" } }
        );
      })
      .mockImplementationOnce(async (input, init) => {
        const headers = new Headers(init?.headers);
        calls.push({ url: String(input), authorization: headers.get("Authorization") });
        return new Response("ok", { status: 200 });
      });

    const client = createApiClient(
      {
        getAccessToken: () => token,
        setSession,
        clearSession
      },
      {
        fetchImpl: fetchMock,
        baseUrl: "http://test.local/api",
        onAuthFailure: () => undefined
      }
    );

    const response = await client.request("/protected", { method: "GET" });

    expect(response.status).toBe(200);
    expect(setSession).toHaveBeenCalledTimes(1);
    expect(clearSession).not.toHaveBeenCalled();
    expect(calls[0]?.url).toContain("/protected");
    expect(calls[0]?.authorization).toBe("Bearer old-token");
    expect(calls[1]?.url).toContain("/auth/refresh");
    expect(calls[2]?.url).toContain("/protected");
    expect(calls[2]?.authorization).toBe("Bearer new-token");
  });

  it("clears session when refresh fails", async () => {
    let token: string | null = "old-token";
    const setSession = vi.fn(({ accessToken }: { accessToken: string; user: User }) => {
      token = accessToken;
    });
    const clearSession = vi.fn(() => {
      token = null;
    });
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response("unauthorized", { status: 401 }))
      .mockResolvedValueOnce(new Response("forbidden", { status: 403 }));

    const client = createApiClient(
      {
        getAccessToken: () => token,
        setSession,
        clearSession
      },
      {
        fetchImpl: fetchMock,
        baseUrl: "http://test.local/api",
        onAuthFailure: () => undefined
      }
    );

    const response = await client.request("/protected", { method: "GET" });

    expect(response.status).toBe(401);
    expect(setSession).not.toHaveBeenCalled();
    expect(clearSession).toHaveBeenCalledTimes(1);
  });

  it("clears session when retry after refresh still returns 401", async () => {
    const clearSession = vi.fn();
    const onAuthFailure = vi.fn();
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response("unauthorized", { status: 401 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            user: makeUser(),
            access_token: "new-token",
            access_token_expires_in: 900
          }),
          { status: 200, headers: { "content-type": "application/json" } }
        )
      )
      .mockResolvedValueOnce(new Response("still-unauthorized", { status: 401 }));

    const client = createApiClient(
      {
        getAccessToken: () => "old-token",
        setSession: () => undefined,
        clearSession
      },
      {
        fetchImpl: fetchMock,
        baseUrl: "http://test.local/api",
        onAuthFailure
      }
    );

    const response = await client.request("/protected", { method: "GET" });
    expect(response.status).toBe(401);
    expect(clearSession).toHaveBeenCalledTimes(1);
    expect(onAuthFailure).toHaveBeenCalledTimes(1);
  });

  it("does not clear session on refresh network failure and surfaces the error", async () => {
    const clearSession = vi.fn();
    const onAuthFailure = vi.fn();
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response("unauthorized", { status: 401 }))
      .mockRejectedValueOnce(new TypeError("network down"));

    const client = createApiClient(
      {
        getAccessToken: () => "old-token",
        setSession: () => undefined,
        clearSession
      },
      {
        fetchImpl: fetchMock,
        baseUrl: "http://test.local/api",
        onAuthFailure
      }
    );

    await expect(client.request("/protected", { method: "GET" })).rejects.toThrow("network down");
    expect(clearSession).not.toHaveBeenCalled();
    expect(onAuthFailure).not.toHaveBeenCalled();
  });

  it("publishes mapped auth toast with request id on refresh 403", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response("unauthorized", { status: 401 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            type: "https://api.budgetbuddy.dev/problems/forbidden",
            title: "Forbidden",
            status: 403,
            detail: "Refresh revoked"
          }),
          {
            status: 403,
            headers: {
              "content-type": "application/problem+json",
              "X-Request-Id": "req-refresh-403"
            }
          }
        )
      );

    const client = createApiClient(
      {
        getAccessToken: () => "old-token",
        setSession: () => undefined,
        clearSession: () => undefined
      },
      {
        fetchImpl: fetchMock,
        baseUrl: "http://test.local/api",
        onAuthFailure: () => undefined
      }
    );

    await client.request("/protected", { method: "GET" });

    expect(publishProblemToast).toHaveBeenCalledTimes(1);
    expect(publishProblemToast).toHaveBeenCalledWith(
      expect.objectContaining({
        requestId: "req-refresh-403",
        status: 403,
        type: "https://api.budgetbuddy.dev/problems/forbidden"
      })
    );
  });

  it("retries refresh once when backend reports refresh-reuse-detected", async () => {
    let token = "old-token";
    const setSession = vi.fn(({ accessToken }: { accessToken: string; user: User }) => {
      token = accessToken;
    });
    const clearSession = vi.fn();
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response("unauthorized", { status: 401 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            type: "https://api.budgetbuddy.dev/problems/refresh-reuse-detected",
            title: "Refresh token reuse detected",
            status: 403,
            detail: "Refresh token was already used and rotated"
          }),
          { status: 403, headers: { "content-type": "application/problem+json" } }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            user: makeUser(),
            access_token: "new-token",
            access_token_expires_in: 900
          }),
          { status: 200, headers: { "content-type": "application/json" } }
        )
      )
      .mockResolvedValueOnce(new Response("ok", { status: 200 }));

    const client = createApiClient(
      {
        getAccessToken: () => token,
        setSession,
        clearSession
      },
      {
        fetchImpl: fetchMock,
        baseUrl: "http://test.local/api",
        onAuthFailure: () => undefined
      }
    );

    const response = await client.request("/protected", { method: "GET" });

    expect(response.status).toBe(200);
    expect(setSession).toHaveBeenCalledTimes(1);
    expect(clearSession).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it("sends vendor content-type for refresh post without body", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response("unauthorized", { status: 401 }));
    const clearSession = vi.fn();

    const client = createApiClient(
      {
        getAccessToken: () => null,
        setSession: () => undefined,
        clearSession
      },
      {
        fetchImpl: fetchMock,
        baseUrl: "http://test.local/api",
        onAuthFailure: () => undefined
      }
    );

    await client.refresh();

    const secondArg = fetchMock.mock.calls[0]?.[1];
    const headers = new Headers(secondArg?.headers);
    expect(headers.get("Content-Type")).toBe("application/vnd.budgetbuddy.v1+json");
  });

  it("uses credentials include for login, refresh, and logout", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response("bad", { status: 401 }))
      .mockResolvedValueOnce(new Response("bad", { status: 401 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    const client = createApiClient(
      {
        getAccessToken: () => null,
        setSession: () => undefined,
        clearSession: () => undefined
      },
      {
        fetchImpl: fetchMock,
        baseUrl: "http://test.local/api",
        onAuthFailure: () => undefined
      }
    );

    await expect(client.login("demo", "secret")).rejects.toThrow("login_failed");
    await client.refresh();
    await client.logout();

    for (const call of fetchMock.mock.calls) {
      const init = call[1];
      expect(init?.credentials).toBe("include");
    }
  });

  it("adds auth, accept, request id and credentials on protected requests", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response("ok", { status: 200 }));
    const client = createApiClient(
      {
        getAccessToken: () => "access-123",
        setSession: () => undefined,
        clearSession: () => undefined
      },
      { fetchImpl: fetchMock, baseUrl: "http://test.local/api", onAuthFailure: () => undefined }
    );

    await client.request("/me", { method: "GET" });

    const args = fetchMock.mock.calls[0];
    expect(String(args?.[0])).toBe("http://test.local/api/me");
    const init = args?.[1];
    const headers = new Headers(init?.headers);
    expect(headers.get("Accept")).toBe("application/vnd.budgetbuddy.v1+json");
    expect(headers.get("Authorization")).toBe("Bearer access-123");
    expect(headers.get("X-Request-Id")).toBeTruthy();
    expect(init?.credentials).toBe("include");
  });

  it("shares a single inflight refresh call", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          user: makeUser(),
          access_token: "token-shared",
          access_token_expires_in: 900
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      )
    );

    const client = createApiClient(
      {
        getAccessToken: () => null,
        setSession: () => undefined,
        clearSession: () => undefined
      },
      { fetchImpl: fetchMock, baseUrl: "http://test.local/api", onAuthFailure: () => undefined }
    );

    const [first, second] = await Promise.all([client.refresh(), client.refresh()]);

    expect(first?.access_token).toBe("token-shared");
    expect(second?.access_token).toBe("token-shared");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("skips refresh while page is unloading", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response("unauthorized", { status: 401 }));
    const client = createApiClient(
      {
        getAccessToken: () => "old-token",
        setSession: () => undefined,
        clearSession: () => undefined
      },
      { fetchImpl: fetchMock, baseUrl: "http://test.local/api", onAuthFailure: () => undefined }
    );

    window.dispatchEvent(new Event("beforeunload"));
    const response = await client.request("/protected", { method: "GET" });

    expect(response.status).toBe(401);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("throws on login failure and on me failure", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response("bad", { status: 401 }))
      .mockResolvedValueOnce(new Response("bad", { status: 500 }));

    const client = createApiClient(
      {
        getAccessToken: () => "access-123",
        setSession: () => undefined,
        clearSession: () => undefined
      },
      { fetchImpl: fetchMock, baseUrl: "http://test.local/api", onAuthFailure: () => undefined }
    );

    await expect(client.login("u", "p")).rejects.toThrow("login_failed");
    await expect(client.me()).rejects.toThrow("me_failed");
  });

  it("register posts payload and returns auth session", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          user: makeUser(),
          access_token: "token-register",
          access_token_expires_in: 900
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      )
    );
    const client = createApiClient(
      {
        getAccessToken: () => null,
        setSession: () => undefined,
        clearSession: () => undefined
      },
      { fetchImpl: fetchMock, baseUrl: "http://test.local/api", onAuthFailure: () => undefined }
    );

    const response = await client.register({
      username: "demo",
      password: "secret",
      currency_code: "USD"
    });
    expect(response.access_token).toBe("token-register");

    const call = fetchMock.mock.calls[0];
    const init = call?.[1];
    const headers = new Headers(init?.headers);
    expect(String(call?.[0])).toBe("http://test.local/api/auth/register");
    expect(headers.get("Content-Type")).toBe("application/vnd.budgetbuddy.v1+json");
    expect(init?.credentials).toBe("include");
  });

  it("register throws normalized problem error on failure", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          type: "https://api.budgetbuddy.dev/problems/budget-duplicate",
          title: "Conflict",
          status: 409,
          detail: "duplicate"
        }),
        { status: 409, headers: { "content-type": "application/problem+json", "X-Request-Id": "req-register-409" } }
      )
    );
    const client = createApiClient(
      {
        getAccessToken: () => null,
        setSession: () => undefined,
        clearSession: () => undefined
      },
      { fetchImpl: fetchMock, baseUrl: "http://test.local/api", onAuthFailure: () => undefined }
    );

    await expect(
      client.register({
        username: "demo",
        password: "secret",
        currency_code: "USD"
      })
    ).rejects.toMatchObject({
      name: "ApiProblemError",
      httpStatus: 409,
      requestId: "req-register-409"
    });
  });

  it("returns parsed payload for login and me success", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            user: makeUser(),
            access_token: "token-1",
            access_token_expires_in: 900
          }),
          { status: 200, headers: { "content-type": "application/json" } }
        )
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify(makeUser()), { status: 200, headers: { "content-type": "application/json" } })
      );

    const client = createApiClient(
      {
        getAccessToken: () => "access-123",
        setSession: () => undefined,
        clearSession: () => undefined
      },
      { fetchImpl: fetchMock, baseUrl: "http://test.local/api", onAuthFailure: () => undefined }
    );

    const loginResult = await client.login("demo", "secret");
    const meResult = await client.me();
    expect(loginResult.access_token).toBe("token-1");
    expect(meResult.username).toBe("demo");
  });

  it("requestPublic omits authorization header", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response("ok", { status: 200 }));
    const client = createApiClient(
      {
        getAccessToken: () => "access-123",
        setSession: () => undefined,
        clearSession: () => undefined
      },
      { fetchImpl: fetchMock, baseUrl: "http://test.local/api", onAuthFailure: () => undefined }
    );

    await client.requestPublic("/public", { method: "GET" });
    const headers = new Headers(fetchMock.mock.calls[0]?.[1]?.headers);
    expect(headers.get("Authorization")).toBeNull();
    expect(headers.has("Content-Type")).toBe(false);
  });

  it("uses default auth failure handler and routes to /login", async () => {
    window.history.replaceState({}, "", "/app/dashboard");
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response("unauthorized", { status: 401 }))
      .mockResolvedValueOnce(new Response("forbidden", { status: 403 }));

    const client = createApiClient(
      {
        getAccessToken: () => "access-123",
        setSession: () => undefined,
        clearSession: () => undefined
      },
      { fetchImpl: fetchMock, baseUrl: "http://test.local/api" }
    );

    await client.request("/protected", { method: "GET" });
    expect(window.location.pathname).toBe("/login");
  });

  it("clears session on logout", async () => {
    const clearSession = vi.fn();
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response("ok", { status: 200 }));
    const client = createApiClient(
      {
        getAccessToken: () => "access-123",
        setSession: () => undefined,
        clearSession
      },
      { fetchImpl: fetchMock, baseUrl: "http://test.local/api", onAuthFailure: () => undefined }
    );

    await client.logout();

    expect(clearSession).toHaveBeenCalledTimes(1);
  });

  it("clears session on logout even when request fails", async () => {
    const clearSession = vi.fn();
    const fetchMock = vi.fn<typeof fetch>().mockRejectedValue(new TypeError("network down"));
    const client = createApiClient(
      {
        getAccessToken: () => "access-123",
        setSession: () => undefined,
        clearSession
      },
      { fetchImpl: fetchMock, baseUrl: "http://test.local/api", onAuthFailure: () => undefined }
    );

    await expect(client.logout()).rejects.toThrow("network down");
    expect(clearSession).toHaveBeenCalledTimes(1);
  });

  it("publishes non-blocking logout feedback with request id on 5xx response", async () => {
    const clearSession = vi.fn();
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          type: "https://api.budgetbuddy.dev/problems/forbidden",
          title: "Forbidden",
          status: 500
        }),
        {
          status: 500,
          headers: {
            "content-type": "application/problem+json",
            "X-Request-Id": "req-logout-500"
          }
        }
      )
    );
    const client = createApiClient(
      {
        getAccessToken: () => "access-123",
        setSession: () => undefined,
        clearSession
      },
      { fetchImpl: fetchMock, baseUrl: "http://test.local/api", onAuthFailure: () => undefined }
    );

    await expect(client.logout()).resolves.toBeUndefined();
    expect(clearSession).toHaveBeenCalledTimes(1);
    expect(publishProblemToast).toHaveBeenCalledWith(
      expect.objectContaining({
        requestId: "req-logout-500",
        status: 500
      })
    );
  });
});
