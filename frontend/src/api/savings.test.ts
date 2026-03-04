import { describe, expect, it, vi } from "vitest";

import { createApiClient } from "@/api/client";
import {
  archiveSavingsGoal,
  cancelSavingsGoal,
  completeSavingsGoal,
  createSavingsContribution,
  createSavingsGoal,
  deleteSavingsContribution,
  getSavingsGoal,
  getSavingsSummary,
  listSavingsGoals,
  updateSavingsGoal
} from "@/api/savings";

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

describe("savings api wrappers", () => {
  it("lists goals with status filter and auth header", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ items: [] }), {
        status: 200,
        headers: { "content-type": "application/json" }
      })
    );
    const client = makeClient(fetchMock);

    await listSavingsGoals(client, { status: "completed" });

    const call = fetchMock.mock.calls[0];
    expect(String(call?.[0])).toContain("/savings-goals?status=completed");
    const headers = new Headers(call?.[1]?.headers);
    expect(headers.get("Accept")).toBe("application/vnd.budgetbuddy.v1+json");
    expect(headers.get("Authorization")).toBe("Bearer access-123");
  });

  it("calls savings CRUD, actions, contributions, and summary endpoints", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: "goal_1",
            name: "Emergency Fund",
            target_cents: 500000,
            account_id: "acc_1",
            category_id: "cat_1",
            deadline: "2026-12-31",
            note: null,
            status: "active",
            archived_at: null,
            created_at: "2026-03-01T00:00:00Z",
            updated_at: "2026-03-01T00:00:00Z",
            saved_cents: 0,
            remaining_cents: 500000,
            progress_pct: 0
          }),
          { status: 201, headers: { "content-type": "application/json" } }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: "goal_1",
            name: "Emergency Fund",
            target_cents: 500000,
            account_id: "acc_1",
            category_id: "cat_1",
            deadline: "2026-12-31",
            note: null,
            status: "active",
            archived_at: null,
            created_at: "2026-03-01T00:00:00Z",
            updated_at: "2026-03-01T00:00:00Z",
            saved_cents: 50000,
            remaining_cents: 450000,
            progress_pct: 10,
            contributions: []
          }),
          { status: 200, headers: { "content-type": "application/json" } }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: "goal_1",
            name: "Emergency Fund",
            target_cents: 450000,
            account_id: "acc_1",
            category_id: "cat_1",
            deadline: "2026-12-31",
            note: "updated",
            status: "active",
            archived_at: null,
            created_at: "2026-03-01T00:00:00Z",
            updated_at: "2026-03-02T00:00:00Z",
            saved_cents: 50000,
            remaining_cents: 400000,
            progress_pct: 11.1
          }),
          { status: 200, headers: { "content-type": "application/json" } }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: "goal_1",
            name: "Emergency Fund",
            target_cents: 450000,
            account_id: "acc_1",
            category_id: "cat_1",
            deadline: "2026-12-31",
            note: "updated",
            status: "completed",
            archived_at: null,
            created_at: "2026-03-01T00:00:00Z",
            updated_at: "2026-03-02T00:00:00Z",
            saved_cents: 50000,
            remaining_cents: 400000,
            progress_pct: 11.1
          }),
          { status: 200, headers: { "content-type": "application/json" } }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: "goal_1",
            name: "Emergency Fund",
            target_cents: 450000,
            account_id: "acc_1",
            category_id: "cat_1",
            deadline: "2026-12-31",
            note: "updated",
            status: "cancelled",
            archived_at: null,
            created_at: "2026-03-01T00:00:00Z",
            updated_at: "2026-03-02T00:00:00Z",
            saved_cents: 50000,
            remaining_cents: 400000,
            progress_pct: 11.1
          }),
          { status: 200, headers: { "content-type": "application/json" } }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: "contrib_1",
            goal_id: "goal_1",
            amount_cents: 50000,
            transaction_id: "tx_1",
            note: "quincena",
            contributed_at: "2026-03-10T00:00:00Z"
          }),
          { status: 201, headers: { "content-type": "application/json" } }
        )
      )
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            active_count: 1,
            completed_count: 0,
            total_target_cents: 450000,
            total_saved_cents: 50000,
            total_remaining_cents: 400000,
            overall_progress_pct: 11.1
          }),
          { status: 200, headers: { "content-type": "application/json" } }
        )
      )
      .mockResolvedValueOnce(new Response(null, { status: 204 }));

    const client = makeClient(fetchMock);

    await createSavingsGoal(client, {
      name: "Emergency Fund",
      target_cents: 500000,
      account_id: "acc_1",
      category_id: "cat_1"
    });
    await getSavingsGoal(client, "goal_1");
    await updateSavingsGoal(client, "goal_1", { target_cents: 450000, note: "updated" });
    await completeSavingsGoal(client, "goal_1");
    await cancelSavingsGoal(client, "goal_1");
    await createSavingsContribution(client, "goal_1", { amount_cents: 50000, note: "quincena" });
    await deleteSavingsContribution(client, "goal_1", "contrib_1");
    await getSavingsSummary(client);
    await archiveSavingsGoal(client, "goal_1");

    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("/savings-goals");
    expect(String(fetchMock.mock.calls[3]?.[0])).toContain("/savings-goals/goal_1/complete");
    expect(String(fetchMock.mock.calls[5]?.[0])).toContain("/savings-goals/goal_1/contributions");
    expect(String(fetchMock.mock.calls[6]?.[0])).toContain("/savings-goals/goal_1/contributions/contrib_1");
    expect(String(fetchMock.mock.calls[7]?.[0])).toContain("/savings-goals/summary");
    expect(fetchMock.mock.calls[8]?.[1]?.method).toBe("DELETE");
  });
});
