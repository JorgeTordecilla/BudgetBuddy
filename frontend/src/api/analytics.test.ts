import { describe, expect, it, vi } from "vitest";

import { createApiClient } from "@/api/client";
import type { ApiProblemError } from "@/api/problem";
import { getAnalyticsByCategory, getAnalyticsByMonth } from "@/api/analytics";

function makeClient(fetchImpl: typeof fetch) {
  return createApiClient(
    {
      getAccessToken: () => "access-123",
      setSession: () => undefined,
      clearSession: () => undefined
    },
    { fetchImpl, baseUrl: "http://test.local/api", onAuthFailure: () => undefined }
  );
}

describe("analytics api wrappers", () => {
  it("uses vendor accept header and credentials include for analytics requests", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ items: [] }), {
          status: 200,
          headers: { "content-type": "application/json" }
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ items: [] }), {
          status: 200,
          headers: { "content-type": "application/json" }
        })
      );
    const client = makeClient(fetchMock);

    await getAnalyticsByMonth(client, { from: "2026-02-01", to: "2026-02-28" });
    await getAnalyticsByCategory(client, { from: "2026-02-01", to: "2026-02-28" });

    const firstCall = fetchMock.mock.calls[0];
    const secondCall = fetchMock.mock.calls[1];
    expect(String(firstCall?.[0])).toContain("/analytics/by-month?from=2026-02-01&to=2026-02-28");
    expect(String(secondCall?.[0])).toContain("/analytics/by-category?from=2026-02-01&to=2026-02-28");
    expect(new Headers(firstCall?.[1]?.headers).get("Accept")).toBe("application/vnd.budgetbuddy.v1+json");
    expect(new Headers(firstCall?.[1]?.headers).get("Authorization")).toBe("Bearer access-123");
    expect(firstCall?.[1]?.credentials).toBe("include");
  });

  it("propagates ProblemDetails for 400/401/406 failures", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ type: "about:blank", title: "Invalid request", status: 400 }), {
          status: 400,
          headers: { "content-type": "application/problem+json" }
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ type: "about:blank", title: "Unauthorized", status: 401 }), {
          status: 401,
          headers: { "content-type": "application/problem+json" }
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ type: "about:blank", title: "Unauthorized", status: 401 }), {
          status: 401,
          headers: { "content-type": "application/problem+json" }
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ type: "about:blank", title: "Not Acceptable", status: 406 }), {
          status: 406,
          headers: { "content-type": "application/problem+json" }
        })
      );
    const client = makeClient(fetchMock);

    await expect(getAnalyticsByMonth(client, { from: "2026-02-01", to: "2026-02-28" })).rejects.toMatchObject({ status: 400 });
    await expect(getAnalyticsByCategory(client, { from: "2026-02-01", to: "2026-02-28" })).rejects.toMatchObject({ status: 401 });
    await expect(getAnalyticsByMonth(client, { from: "2026-03-01", to: "2026-03-31" })).rejects.toMatchObject({ status: 406 });
  });

  it("attaches Retry-After metadata on 429 responses", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ type: "about:blank", title: "Too Many Requests", status: 429 }), {
        status: 429,
        headers: {
          "content-type": "application/problem+json",
          "Retry-After": "30"
        }
      })
    );
    const client = makeClient(fetchMock);

    await expect(getAnalyticsByMonth(client, { from: "2026-02-01", to: "2026-02-28" })).rejects.toMatchObject({
      status: 429,
      retryAfter: "30"
    } satisfies Partial<ApiProblemError & { retryAfter: string }>);
  });
});
