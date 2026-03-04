import { describe, expect, it, vi } from "vitest";

import { createApiClient } from "@/api/client";
import { applyRollover, getRolloverPreview } from "@/api/rollover";

function makeClient(fetchImpl: typeof fetch) {
  return createApiClient(
    {
      getAccessToken: () => "access-123",
      setSession: () => undefined,
      clearSession: () => undefined,
    },
    { fetchImpl, baseUrl: "http://test.local/api", onAuthFailure: () => undefined }
  );
}

describe("rollover api wrappers", () => {
  it("fetches rollover preview with vendor headers", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({ month: "2026-02", surplus_cents: 9000, already_applied: false, applied_transaction_id: null }),
        { status: 200, headers: { "content-type": "application/json" } }
      )
    );
    const client = makeClient(fetchMock);

    const result = await getRolloverPreview(client, "2026-02");
    expect(result.surplus_cents).toBe(9000);

    const firstCall = fetchMock.mock.calls[0];
    expect(String(firstCall?.[0])).toContain("/rollover/preview?month=2026-02");
    expect(new Headers(firstCall?.[1]?.headers).get("Accept")).toBe("application/vnd.budgetbuddy.v1+json");
  });

  it("applies rollover and propagates ProblemDetails errors", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            source_month: "2026-02",
            target_month: "2026-03",
            transaction_id: "tx-1",
            amount_cents: 9000,
          }),
          { status: 201, headers: { "content-type": "application/json" } }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            type: "https://api.budgetbuddy.dev/problems/rollover-no-surplus",
            title: "Rollover has no surplus",
            status: 422,
          }),
          { status: 422, headers: { "content-type": "application/problem+json" } }
        )
      );
    const client = makeClient(fetchMock);

    const success = await applyRollover(client, {
      source_month: "2026-02",
      account_id: "acc-1",
      category_id: "cat-1",
    });
    expect(success.amount_cents).toBe(9000);

    await expect(
      applyRollover(client, {
        source_month: "2026-01",
        account_id: "acc-1",
        category_id: "cat-1",
      })
    ).rejects.toMatchObject({ status: 422 });
  });
});
