import { describe, expect, it, vi } from "vitest";

import { createApiClient } from "@/api/client";
import {
  archiveIncomeSource,
  createIncomeSource,
  getIncomeSource,
  listIncomeSources,
  restoreIncomeSource,
  updateIncomeSource
} from "@/api/incomeSources";
import type { ApiProblemError } from "@/api/problem";

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

describe("income sources api wrappers", () => {
  it("lists income sources with include_archived param", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ items: [] }), {
        status: 200,
        headers: { "content-type": "application/json" }
      })
    );

    const client = makeClient(fetchMock);
    await listIncomeSources(client, { includeArchived: true });

    const call = fetchMock.mock.calls[0];
    expect(String(call?.[0])).toContain("/income-sources?include_archived=true");
    const headers = new Headers(call?.[1]?.headers);
    expect(headers.get("Authorization")).toBe("Bearer access-123");
  });

  it("creates, fetches, updates, restores, and archives income source", async () => {
    const payload = {
      id: "is1",
      name: "Paycheck 1",
      expected_amount_cents: 250000,
      frequency: "monthly",
      is_active: true,
      note: null,
      archived_at: null,
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z"
    };

    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify(payload), { status: 201, headers: { "content-type": "application/json" } }))
      .mockResolvedValueOnce(new Response(JSON.stringify(payload), { status: 200, headers: { "content-type": "application/json" } }))
      .mockResolvedValueOnce(new Response(JSON.stringify(payload), { status: 200, headers: { "content-type": "application/json" } }))
      .mockResolvedValueOnce(new Response(JSON.stringify(payload), { status: 200, headers: { "content-type": "application/json" } }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));

    const client = makeClient(fetchMock);

    await createIncomeSource(client, {
      name: "Paycheck 1",
      expected_amount_cents: 250000,
      frequency: "monthly",
      is_active: true
    });
    await getIncomeSource(client, "is1");
    await updateIncomeSource(client, "is1", { note: "updated" });
    await restoreIncomeSource(client, "is1");
    await archiveIncomeSource(client, "is1");

    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("/income-sources");
    expect(String(fetchMock.mock.calls[1]?.[0])).toContain("/income-sources/is1");
    expect(fetchMock.mock.calls[2]?.[1]?.method).toBe("PATCH");
    expect(fetchMock.mock.calls[4]?.[1]?.method).toBe("DELETE");
  });

  it("propagates conflict ProblemDetails", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          type: "https://api.budgetbuddy.dev/problems/conflict",
          title: "Conflict",
          status: 409,
          detail: "Income source name already exists"
        }),
        { status: 409, headers: { "content-type": "application/problem+json" } }
      )
    );

    const client = makeClient(fetchMock);
    await expect(
      createIncomeSource(client, {
        name: "Paycheck 1",
        expected_amount_cents: 250000,
        frequency: "monthly",
        is_active: true
      })
    ).rejects.toMatchObject({
      status: 409,
      problem: expect.objectContaining({ title: "Conflict", status: 409 })
    } satisfies Partial<ApiProblemError>);
  });
});
