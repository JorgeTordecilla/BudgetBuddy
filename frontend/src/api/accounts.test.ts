import { describe, expect, it, vi } from "vitest";

import { createApiClient } from "@/api/client";
import { archiveAccount, createAccount, listAccounts, updateAccount } from "@/api/accounts";
import { ApiProblemError } from "@/api/problem";

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

describe("accounts api wrappers", () => {
  it("uses vendor headers and credentials include for list requests", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ items: [], next_cursor: null }), {
        status: 200,
        headers: { "content-type": "application/json" }
      })
    );

    const client = makeClient(fetchMock);
    await listAccounts(client, { includeArchived: true, limit: 10 });

    const call = fetchMock.mock.calls[0];
    expect(String(call?.[0])).toContain("/accounts?include_archived=true&limit=10");
    const init = call?.[1];
    const headers = new Headers(init?.headers);
    expect(headers.get("Accept")).toBe("application/vnd.budgetbuddy.v1+json");
    expect(headers.get("Authorization")).toBe("Bearer access-123");
    expect(init?.credentials).toBe("include");
  });

  it("includes cursor in list query when provided", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ items: [], next_cursor: null }), {
        status: 200,
        headers: { "content-type": "application/json" }
      })
    );

    const client = makeClient(fetchMock);
    await listAccounts(client, { cursor: "cursor-1" });

    const call = fetchMock.mock.calls[0];
    expect(String(call?.[0])).toContain("/accounts?include_archived=false&cursor=cursor-1");
  });

  it("throws ApiProblemError with canonical problem on 409 conflict", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          type: "https://api.budgetbuddy.dev/problems/conflict",
          title: "Conflict",
          status: 409,
          detail: "Account already exists"
        }),
        {
          status: 409,
          headers: { "content-type": "application/problem+json" }
        }
      )
    );

    const client = makeClient(fetchMock);

    await expect(
      createAccount(client, {
        name: "Main",
        type: "cash",
        initial_balance_cents: 1000
      })
    ).rejects.toMatchObject({
      name: "ApiProblemError",
      status: 409,
      problem: expect.objectContaining({ title: "Conflict", status: 409 })
    } satisfies Partial<ApiProblemError>);
  });

  it("updates and archives account with contract paths", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: "a1",
            name: "Main",
            type: "cash",
            initial_balance_cents: 100,
            note: null,
            archived_at: null
          }),
          { status: 200, headers: { "content-type": "application/json" } }
        )
      )
      .mockResolvedValueOnce(new Response(null, { status: 204 }));

    const client = makeClient(fetchMock);
    await updateAccount(client, "a1", { name: "Main" });
    await archiveAccount(client, "a1");

    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("/accounts/a1");
    expect(fetchMock.mock.calls[0]?.[1]?.method).toBe("PATCH");
    expect(String(fetchMock.mock.calls[1]?.[0])).toContain("/accounts/a1");
    expect(fetchMock.mock.calls[1]?.[1]?.method).toBe("DELETE");
  });

  it("creates account and returns parsed payload", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          id: "a2",
          name: "Savings",
          type: "bank",
          initial_balance_cents: 2000,
          note: null,
          archived_at: null
        }),
        { status: 201, headers: { "content-type": "application/json" } }
      )
    );

    const client = makeClient(fetchMock);
    const result = await createAccount(client, {
      name: "Savings",
      type: "bank",
      initial_balance_cents: 2000
    });
    expect(result.name).toBe("Savings");
  });

  it("throws fallback ApiProblemError when response is not problem+json", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response("failed", { status: 500 }));
    const client = makeClient(fetchMock);

    await expect(archiveAccount(client, "a1")).rejects.toMatchObject({
      name: "ApiProblemError",
      status: 500,
      problem: null
    } satisfies Partial<ApiProblemError>);
  });
});
