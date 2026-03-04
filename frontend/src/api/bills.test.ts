import { describe, expect, it, vi } from "vitest";

import { createApiClient } from "@/api/client";
import type { ApiProblemError } from "@/api/problem";
import {
  archiveBill,
  createBill,
  getBill,
  getBillMonthlyStatus,
  listBills,
  markBillPaid,
  unmarkBillPaid,
  updateBill
} from "@/api/bills";

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

describe("bills api wrappers", () => {
  it("lists bills with include_archived and auth headers", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ items: [] }), {
        status: 200,
        headers: { "content-type": "application/json" }
      })
    );
    const client = makeClient(fetchMock);

    await listBills(client, { includeArchived: true });

    const call = fetchMock.mock.calls[0];
    expect(String(call?.[0])).toContain("/bills?include_archived=true");
    const headers = new Headers(call?.[1]?.headers);
    expect(headers.get("Accept")).toBe("application/vnd.budgetbuddy.v1+json");
    expect(headers.get("Authorization")).toBe("Bearer access-123");
  });

  it("calls CRUD, monthly-status, mark-paid, and unmark endpoints", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: "bill_1",
            name: "Electricity",
            due_day: 28,
            budget_cents: 200000,
            category_id: "cat_1",
            account_id: "acc_1",
            note: null,
            is_active: true,
            archived_at: null,
            created_at: "2026-03-01T00:00:00Z",
            updated_at: "2026-03-01T00:00:00Z"
          }),
          { status: 201, headers: { "content-type": "application/json" } }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: "bill_1",
            name: "Electricity",
            due_day: 28,
            budget_cents: 200000,
            category_id: "cat_1",
            account_id: "acc_1",
            note: null,
            is_active: true,
            archived_at: null,
            created_at: "2026-03-01T00:00:00Z",
            updated_at: "2026-03-01T00:00:00Z"
          }),
          { status: 200, headers: { "content-type": "application/json" } }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: "bill_1",
            name: "Electricity Home",
            due_day: 28,
            budget_cents: 210000,
            category_id: "cat_1",
            account_id: "acc_1",
            note: "updated",
            is_active: true,
            archived_at: null,
            created_at: "2026-03-01T00:00:00Z",
            updated_at: "2026-03-02T00:00:00Z"
          }),
          { status: 200, headers: { "content-type": "application/json" } }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            month: "2026-03",
            summary: {
              total_budget_cents: 210000,
              total_paid_cents: 87570,
              total_pending_cents: 122430,
              paid_count: 1,
              pending_count: 0
            },
            items: []
          }),
          { status: 200, headers: { "content-type": "application/json" } }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: "pay_1",
            bill_id: "bill_1",
            month: "2026-03",
            actual_cents: 87570,
            transaction_id: "tx_1",
            paid_at: "2026-03-02T00:00:00Z"
          }),
          { status: 201, headers: { "content-type": "application/json" } }
        )
      )
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    const client = makeClient(fetchMock);

    await createBill(client, {
      name: "Electricity",
      due_day: 28,
      budget_cents: 200000,
      category_id: "cat_1",
      account_id: "acc_1",
      is_active: true
    });
    await getBill(client, "bill_1");
    await updateBill(client, "bill_1", { name: "Electricity Home", budget_cents: 210000, note: "updated" });
    await getBillMonthlyStatus(client, "2026-03");
    await markBillPaid(client, "bill_1", { month: "2026-03", actual_cents: 87570 });
    await unmarkBillPaid(client, "bill_1", "2026-03");
    await archiveBill(client, "bill_1");

    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("/bills");
    expect(fetchMock.mock.calls[0]?.[1]?.method).toBe("POST");
    expect(String(fetchMock.mock.calls[3]?.[0])).toContain("/bills/monthly-status?month=2026-03");
    expect(String(fetchMock.mock.calls[4]?.[0])).toContain("/bills/bill_1/payments");
    expect(String(fetchMock.mock.calls[5]?.[0])).toContain("/bills/bill_1/payments/2026-03");
    expect(String(fetchMock.mock.calls[6]?.[0])).toContain("/bills/bill_1");
    expect(fetchMock.mock.calls[6]?.[1]?.method).toBe("DELETE");
  });

  it("propagates canonical ProblemDetails from bill errors", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            type: "https://api.budgetbuddy.dev/problems/bill-category-type-mismatch",
            title: "Bill category must be of type expense",
            status: 409
          }),
          { status: 409, headers: { "content-type": "application/problem+json" } }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            type: "https://api.budgetbuddy.dev/problems/bill-due-day-invalid",
            title: "Bill due day must be between 1 and 28",
            status: 422
          }),
          { status: 422, headers: { "content-type": "application/problem+json" } }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            type: "https://api.budgetbuddy.dev/problems/bill-already-paid",
            title: "Bill already paid for this month",
            status: 409
          }),
          { status: 409, headers: { "content-type": "application/problem+json" } }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            type: "https://api.budgetbuddy.dev/problems/bill-inactive-for-month",
            title: "Bill is inactive for this month",
            status: 409
          }),
          { status: 409, headers: { "content-type": "application/problem+json" } }
        )
      );
    const client = makeClient(fetchMock);

    await expect(createBill(client, {
      name: "Bad",
      due_day: 1,
      budget_cents: 1,
      category_id: "income_cat",
      account_id: "acc_1"
    })).rejects.toMatchObject({
      name: "ApiProblemError",
      status: 409,
      problem: expect.objectContaining({
        type: "https://api.budgetbuddy.dev/problems/bill-category-type-mismatch"
      })
    } satisfies Partial<ApiProblemError>);

    await expect(createBill(client, {
      name: "Bad due day",
      due_day: 31,
      budget_cents: 1,
      category_id: "cat_1",
      account_id: "acc_1"
    })).rejects.toMatchObject({ status: 422 });

    await expect(markBillPaid(client, "bill_1", { month: "2026-03" })).rejects.toMatchObject({ status: 409 });
    await expect(markBillPaid(client, "bill_1", { month: "2026-03" })).rejects.toMatchObject({ status: 409 });
  });
});
