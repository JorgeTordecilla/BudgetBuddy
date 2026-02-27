import { describe, expect, it, vi } from "vitest";

import { createApiClient } from "@/api/client";
import type { ApiProblemError } from "@/api/problem";
import { archiveBudget, createBudget, getBudget, listBudgets, updateBudget } from "@/api/budgets";

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

describe("budgets api wrappers", () => {
  it("uses vendor headers and credentials include for list", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ items: [] }), {
        status: 200,
        headers: { "content-type": "application/json" }
      })
    );
    const client = makeClient(fetchMock);

    await listBudgets(client, { from: "2026-02", to: "2026-04" });

    const call = fetchMock.mock.calls[0];
    expect(String(call?.[0])).toContain("/budgets?from=2026-02&to=2026-04");
    const headers = new Headers(call?.[1]?.headers);
    expect(headers.get("Accept")).toBe("application/vnd.budgetbuddy.v1+json");
    expect(headers.get("Authorization")).toBe("Bearer access-123");
    expect(call?.[1]?.credentials).toBe("include");
  });

  it("creates, gets, updates, and archives budgets through contract paths", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: "b1",
            month: "2026-02",
            category_id: "c1",
            limit_cents: 12345,
            archived_at: null,
            created_at: "2026-02-01T00:00:00Z",
            updated_at: "2026-02-01T00:00:00Z"
          }),
          { status: 200, headers: { "content-type": "application/json" } }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: "b1",
            month: "2026-02",
            category_id: "c1",
            limit_cents: 12345,
            archived_at: null,
            created_at: "2026-02-01T00:00:00Z",
            updated_at: "2026-02-01T00:00:00Z"
          }),
          { status: 201, headers: { "content-type": "application/json" } }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: "b1",
            month: "2026-03",
            category_id: "c2",
            limit_cents: 20000,
            archived_at: null,
            created_at: "2026-02-01T00:00:00Z",
            updated_at: "2026-02-02T00:00:00Z"
          }),
          { status: 200, headers: { "content-type": "application/json" } }
        )
      )
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    const client = makeClient(fetchMock);

    await createBudget(client, { month: "2026-02", category_id: "c1", limit_cents: 12345 });
    await getBudget(client, "b1");
    await updateBudget(client, "b1", { month: "2026-03", category_id: "c2", limit_cents: 20000 });
    await archiveBudget(client, "b1");

    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("/budgets");
    expect(fetchMock.mock.calls[0]?.[1]?.method).toBe("POST");
    expect(String(fetchMock.mock.calls[1]?.[0])).toContain("/budgets/b1");
    expect(fetchMock.mock.calls[1]?.[1]?.method).toBe("GET");
    expect(String(fetchMock.mock.calls[2]?.[0])).toContain("/budgets/b1");
    expect(fetchMock.mock.calls[2]?.[1]?.method).toBe("PATCH");
    expect(String(fetchMock.mock.calls[3]?.[0])).toContain("/budgets/b1");
    expect(fetchMock.mock.calls[3]?.[1]?.method).toBe("DELETE");
  });

  it("propagates ProblemDetails on conflict", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          type: "https://api.budgetbuddy.dev/problems/budget-duplicate",
          title: "Budget already exists",
          status: 409,
          detail: "A budget already exists for this month and category."
        }),
        {
          status: 409,
          headers: { "content-type": "application/problem+json" }
        }
      )
    );
    const client = makeClient(fetchMock);

    await expect(createBudget(client, { month: "2026-02", category_id: "c1", limit_cents: 12345 })).rejects.toMatchObject({
      name: "ApiProblemError",
      status: 409,
      problem: expect.objectContaining({ status: 409 })
    } satisfies Partial<ApiProblemError>);
  });

  it("throws ProblemDetails for list/update/archive failures", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ type: "about:blank", title: "Bad Request", status: 400 }),
          { status: 400, headers: { "content-type": "application/problem+json" } }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ type: "about:blank", title: "Not Found", status: 404 }),
          { status: 404, headers: { "content-type": "application/problem+json" } }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ type: "about:blank", title: "Conflict", status: 409 }),
          { status: 409, headers: { "content-type": "application/problem+json" } }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ type: "about:blank", title: "Forbidden", status: 403 }),
          { status: 403, headers: { "content-type": "application/problem+json" } }
        )
      );
    const client = makeClient(fetchMock);

    await expect(listBudgets(client, { from: "2026-01", to: "2026-01" })).rejects.toMatchObject({ status: 400 });
    await expect(getBudget(client, "b1")).rejects.toMatchObject({ status: 404 });
    await expect(updateBudget(client, "b1", { limit_cents: 100 })).rejects.toMatchObject({ status: 409 });
    await expect(archiveBudget(client, "b1")).rejects.toMatchObject({ status: 403 });
  });
});
