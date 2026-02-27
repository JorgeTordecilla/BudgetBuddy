import { describe, expect, it, vi } from "vitest";

import { createApiClient } from "@/api/client";
import { ApiProblemError } from "@/api/problem";
import {
  archiveTransaction,
  createTransaction,
  importTransactions,
  listTransactions,
  restoreTransaction,
  updateTransaction
} from "@/api/transactions";

type SessionBinding = { accessToken: string | null };

function makeClient(fetchImpl: typeof fetch) {
  const binding: SessionBinding = { accessToken: "access-123" };
  return createApiClient(
    {
      getAccessToken: () => binding.accessToken,
      setSession: (next) => {
        binding.accessToken = next.accessToken;
      },
      clearSession: () => {
        binding.accessToken = null;
      }
    },
    { fetchImpl, baseUrl: "http://test.local/api", onAuthFailure: () => undefined }
  );
}

function makeClientWithSpies(fetchImpl: typeof fetch) {
  const binding: SessionBinding = { accessToken: "access-123" };
  const setSession = vi.fn((next: { accessToken: string }) => {
    binding.accessToken = next.accessToken;
  });
  const clearSession = vi.fn(() => {
    binding.accessToken = null;
  });

  const client = createApiClient(
    {
      getAccessToken: () => binding.accessToken,
      setSession,
      clearSession
    },
    { fetchImpl, baseUrl: "http://test.local/api", onAuthFailure: () => undefined }
  );
  return { client, setSession, clearSession };
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

  it("imports transactions with contract path", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          created_count: 1,
          failed_count: 1,
          failures: [{ index: 1, message: "invalid item" }]
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      )
    );
    const client = makeClient(fetchMock);
    const result = await importTransactions(client, {
      mode: "partial",
      items: [
        {
          type: "expense",
          account_id: "a1",
          category_id: "c1",
          amount_cents: 1200,
          date: "2026-02-01"
        }
      ]
    });

    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("/transactions/import");
    expect(fetchMock.mock.calls[0]?.[1]?.method).toBe("POST");
    expect(result.created_count).toBe(1);
  });

  it("omits optional query params when using defaults", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ items: [], next_cursor: null }), {
        status: 200,
        headers: { "content-type": "application/json" }
      })
    );
    const client = makeClient(fetchMock);

    await listTransactions(client, { type: "all", cursor: null, limit: 0 });

    const url = String(fetchMock.mock.calls[0]?.[0]);
    expect(url).toContain("/transactions?include_archived=false");
    expect(url).not.toContain("type=");
    expect(url).not.toContain("cursor=");
    expect(url).not.toContain("limit=");
  });

  it("throws ApiProblemError for list/create/archive failures", async () => {
    const listFetch = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          type: "https://api.budgetbuddy.dev/problems/invalid-cursor",
          title: "Invalid cursor",
          status: 400
        }),
        { status: 400, headers: { "content-type": "application/problem+json" } }
      )
    );
    await expect(listTransactions(makeClient(listFetch))).rejects.toMatchObject({ status: 400 } satisfies Partial<ApiProblemError>);

    const createFetch = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          type: "https://api.budgetbuddy.dev/problems/invalid-request",
          title: "Invalid request",
          status: 400
        }),
        { status: 400, headers: { "content-type": "application/problem+json" } }
      )
    );
    await expect(
      createTransaction(makeClient(createFetch), {
        type: "expense",
        account_id: "a1",
        category_id: "c1",
        amount_cents: 100,
        date: "2026-02-01"
      })
    ).rejects.toMatchObject({ status: 400 } satisfies Partial<ApiProblemError>);

    const archiveFetch = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          type: "https://api.budgetbuddy.dev/problems/forbidden",
          title: "Forbidden",
          status: 403
        }),
        { status: 403, headers: { "content-type": "application/problem+json" } }
      )
    );
    await expect(archiveTransaction(makeClient(archiveFetch), "t1")).rejects.toMatchObject({
      status: 403
    } satisfies Partial<ApiProblemError>);

    const importFetch = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          type: "https://api.budgetbuddy.dev/problems/import-batch-limit-exceeded",
          title: "Import limit exceeded",
          status: 400
        }),
        { status: 400, headers: { "content-type": "application/problem+json" } }
      )
    );
    await expect(
      importTransactions(makeClient(importFetch), {
        mode: "partial",
        items: [
          {
            type: "expense",
            account_id: "a1",
            category_id: "c1",
            amount_cents: 100,
            date: "2026-02-01"
          }
        ]
      })
    ).rejects.toMatchObject({ status: 400 } satisfies Partial<ApiProblemError>);
  });

  it("retries import once after 401 using refresh flow", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            user: { id: "u1", username: "demo", currency_code: "USD" },
            access_token: "access-456",
            access_token_expires_in: 900
          }),
          { status: 200, headers: { "content-type": "application/json" } }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            created_count: 1,
            failed_count: 0,
            failures: []
          }),
          { status: 200, headers: { "content-type": "application/json" } }
        )
      );

    const { client, setSession, clearSession } = makeClientWithSpies(fetchMock);
    const response = await importTransactions(client, {
      mode: "partial",
      items: [
        {
          type: "expense",
          account_id: "a1",
          category_id: "c1",
          amount_cents: 100,
          date: "2026-02-01"
        }
      ]
    });

    expect(response.created_count).toBe(1);
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("/transactions/import");
    expect(String(fetchMock.mock.calls[1]?.[0])).toContain("/auth/refresh");
    expect(String(fetchMock.mock.calls[2]?.[0])).toContain("/transactions/import");
    expect(setSession).toHaveBeenCalledTimes(1);
    expect(clearSession).not.toHaveBeenCalled();
  });
});
