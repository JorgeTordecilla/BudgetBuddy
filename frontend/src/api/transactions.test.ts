import { describe, expect, it, vi } from "vitest";

import { createApiClient } from "@/api/client";
import { ApiProblemError } from "@/api/problem";
import {
  archiveTransaction,
  createTransaction,
  listTransactions,
  restoreTransaction,
  updateTransaction
} from "@/api/transactions";

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

describe("transactions api wrappers", () => {
  it("uses vendor headers and credentials include for list", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ items: [], next_cursor: null }), {
        status: 200,
        headers: { "content-type": "application/json" }
      })
    );
    const client = makeClient(fetchMock);

    await listTransactions(client, {
      includeArchived: true,
      type: "expense",
      accountId: "a1",
      categoryId: "c1",
      from: "2026-01-01",
      to: "2026-01-31",
      limit: 10
    });

    const call = fetchMock.mock.calls[0];
    expect(String(call?.[0])).toContain(
      "/transactions?include_archived=true&type=expense&account_id=a1&category_id=c1&from=2026-01-01&to=2026-01-31&limit=10"
    );
    const init = call?.[1];
    const headers = new Headers(init?.headers);
    expect(headers.get("Accept")).toBe("application/vnd.budgetbuddy.v1+json");
    expect(headers.get("Authorization")).toBe("Bearer access-123");
    expect(init?.credentials).toBe("include");
  });

  it("creates transaction and returns parsed payload", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          id: "t1",
          type: "expense",
          account_id: "a1",
          category_id: "c1",
          amount_cents: 1200,
          date: "2026-02-01",
          merchant: "Cafe",
          note: null,
          archived_at: null,
          created_at: "2026-02-01T10:00:00Z",
          updated_at: "2026-02-01T10:00:00Z"
        }),
        { status: 201, headers: { "content-type": "application/json" } }
      )
    );
    const client = makeClient(fetchMock);
    const created = await createTransaction(client, {
      type: "expense",
      account_id: "a1",
      category_id: "c1",
      amount_cents: 1200,
      date: "2026-02-01"
    });
    expect(created.id).toBe("t1");
  });

  it("updates and restores with PATCH contract path", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: "t1",
            type: "expense",
            account_id: "a1",
            category_id: "c1",
            amount_cents: 2200,
            date: "2026-02-01",
            merchant: null,
            note: "updated",
            archived_at: null,
            created_at: "2026-02-01T10:00:00Z",
            updated_at: "2026-02-02T10:00:00Z"
          }),
          { status: 200, headers: { "content-type": "application/json" } }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: "t1",
            type: "expense",
            account_id: "a1",
            category_id: "c1",
            amount_cents: 2200,
            date: "2026-02-01",
            merchant: null,
            note: "updated",
            archived_at: null,
            created_at: "2026-02-01T10:00:00Z",
            updated_at: "2026-02-03T10:00:00Z"
          }),
          { status: 200, headers: { "content-type": "application/json" } }
        )
      );
    const client = makeClient(fetchMock);

    await updateTransaction(client, "t1", { note: "updated" });
    await restoreTransaction(client, "t1");

    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("/transactions/t1");
    expect(fetchMock.mock.calls[0]?.[1]?.method).toBe("PATCH");
    expect(fetchMock.mock.calls[1]?.[1]?.body).toContain('"archived_at":null');
  });

  it("archives with DELETE contract path", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 204 }));
    const client = makeClient(fetchMock);
    await archiveTransaction(client, "t1");

    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("/transactions/t1");
    expect(fetchMock.mock.calls[0]?.[1]?.method).toBe("DELETE");
  });

  it("throws ApiProblemError with parsed ProblemDetails on conflict", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          type: "https://api.budgetbuddy.dev/problems/category-type-mismatch",
          title: "Category type mismatch",
          status: 409,
          detail: "Transaction type must match category type."
        }),
        {
          status: 409,
          headers: { "content-type": "application/problem+json" }
        }
      )
    );
    const client = makeClient(fetchMock);

    await expect(updateTransaction(client, "t1", { type: "income" })).rejects.toMatchObject({
      name: "ApiProblemError",
      status: 409,
      problem: expect.objectContaining({ status: 409 })
    } satisfies Partial<ApiProblemError>);
  });
});
