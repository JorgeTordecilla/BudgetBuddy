import { describe, expect, it, vi } from "vitest";

import { createApiClient } from "@/api/client";
import {
  archiveCategory,
  createCategory,
  listCategories,
  restoreCategory,
  updateCategory
} from "@/api/categories";

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

describe("categories api wrappers", () => {
  it("sends expected query params and headers for list", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ items: [], next_cursor: null }), {
        status: 200,
        headers: { "content-type": "application/json" }
      })
    );

    const client = makeClient(fetchMock);
    await listCategories(client, { includeArchived: false, type: "income", limit: 5 });

    const call = fetchMock.mock.calls[0];
    expect(String(call?.[0])).toContain("/categories?include_archived=false&type=income&limit=5");
    const headers = new Headers(call?.[1]?.headers);
    expect(headers.get("Accept")).toBe("application/vnd.budgetbuddy.v1+json");
    expect(headers.get("Authorization")).toBe("Bearer access-123");
  });

  it("omits type param when using all filter", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ items: [], next_cursor: null }), {
        status: 200,
        headers: { "content-type": "application/json" }
      })
    );

    const client = makeClient(fetchMock);
    await listCategories(client, { type: "all", cursor: "c1" });

    const call = fetchMock.mock.calls[0];
    expect(String(call?.[0])).toContain("/categories?include_archived=false&cursor=c1");
    expect(String(call?.[0])).not.toContain("type=");
  });

  it("restore sends patch with archived_at null", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          id: "c1",
          name: "Groceries",
          type: "expense",
          note: null,
          archived_at: null
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      )
    );

    const client = makeClient(fetchMock);
    await restoreCategory(client, "cat-1");

    const call = fetchMock.mock.calls[0];
    expect(String(call?.[0])).toContain("/categories/cat-1");
    expect(call?.[1]?.method).toBe("PATCH");
    expect(call?.[1]?.body).toBe(JSON.stringify({ archived_at: null }));
  });

  it("returns canonical conflict details for 409", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          type: "https://api.budgetbuddy.dev/problems/conflict",
          title: "Conflict",
          status: 409,
          detail: "Category already exists"
        }),
        { status: 409, headers: { "content-type": "application/problem+json" } }
      )
    );

    const client = makeClient(fetchMock);
    await expect(createCategory(client, { name: "Salary", type: "income" })).rejects.toMatchObject({
      name: "ApiProblemError",
      status: 409,
      problem: expect.objectContaining({ detail: "Category already exists" })
    });
  });

  it("updates and archives category", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: "c1",
            name: "Salary",
            type: "income",
            note: null,
            archived_at: null
          }),
          { status: 200, headers: { "content-type": "application/json" } }
        )
      )
      .mockResolvedValueOnce(new Response(null, { status: 204 }));

    const client = makeClient(fetchMock);
    await updateCategory(client, "c1", { name: "Salary+" });
    await archiveCategory(client, "c1");

    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("/categories/c1");
    expect(fetchMock.mock.calls[0]?.[1]?.method).toBe("PATCH");
    expect(String(fetchMock.mock.calls[1]?.[0])).toContain("/categories/c1");
    expect(fetchMock.mock.calls[1]?.[1]?.method).toBe("DELETE");
  });

  it("creates category and returns parsed payload", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          id: "c9",
          name: "Travel",
          type: "expense",
          note: null,
          archived_at: null
        }),
        { status: 201, headers: { "content-type": "application/json" } }
      )
    );

    const client = makeClient(fetchMock);
    const result = await createCategory(client, { name: "Travel", type: "expense" });
    expect(result.id).toBe("c9");
  });

  it("throws fallback error without problem payload", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response("oops", { status: 500 }));
    const client = makeClient(fetchMock);
    await expect(archiveCategory(client, "c1")).rejects.toMatchObject({
      name: "ApiProblemError",
      status: 500,
      problem: null
    });
  });
});
