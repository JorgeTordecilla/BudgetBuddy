import type { ApiClient } from "@/api/client";
import { throwApiError } from "@/api/errors";
import type {
  Bill,
  BillCreate,
  BillListResponse,
  BillMonthlyStatusOut,
  BillPaymentCreate,
  BillPaymentOut,
  BillUpdate
} from "@/api/types";

export type ListBillsParams = {
  includeArchived?: boolean;
};

function buildBillsQuery(params: ListBillsParams = {}): string {
  const search = new URLSearchParams();
  if (params.includeArchived) {
    search.set("include_archived", "true");
  }
  return search.toString();
}

export async function listBills(client: ApiClient, params: ListBillsParams = {}): Promise<BillListResponse> {
  const query = buildBillsQuery(params);
  const url = query ? `/bills?${query}` : "/bills";
  const response = await client.request(url, { method: "GET" });
  if (!response.ok) {
    await throwApiError(response, "bills_list_failed");
  }
  return (await response.json()) as BillListResponse;
}

export async function createBill(client: ApiClient, payload: BillCreate): Promise<Bill> {
  const response = await client.request("/bills", {
    method: "POST",
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    await throwApiError(response, "bills_create_failed");
  }
  return (await response.json()) as Bill;
}

export async function getBill(client: ApiClient, billId: string): Promise<Bill> {
  const response = await client.request(`/bills/${billId}`, { method: "GET" });
  if (!response.ok) {
    await throwApiError(response, "bills_get_failed");
  }
  return (await response.json()) as Bill;
}

export async function updateBill(client: ApiClient, billId: string, payload: BillUpdate): Promise<Bill> {
  const response = await client.request(`/bills/${billId}`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    await throwApiError(response, "bills_update_failed");
  }
  return (await response.json()) as Bill;
}

export async function archiveBill(client: ApiClient, billId: string): Promise<void> {
  const response = await client.request(`/bills/${billId}`, { method: "DELETE" });
  if (!response.ok) {
    await throwApiError(response, "bills_archive_failed");
  }
}

export async function getBillMonthlyStatus(client: ApiClient, month: string): Promise<BillMonthlyStatusOut> {
  const response = await client.request(`/bills/monthly-status?month=${encodeURIComponent(month)}`, { method: "GET" });
  if (!response.ok) {
    await throwApiError(response, "bills_monthly_status_failed");
  }
  return (await response.json()) as BillMonthlyStatusOut;
}

export async function markBillPaid(client: ApiClient, billId: string, payload: BillPaymentCreate): Promise<BillPaymentOut> {
  const response = await client.request(`/bills/${billId}/payments`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    await throwApiError(response, "bills_mark_paid_failed");
  }
  return (await response.json()) as BillPaymentOut;
}

export async function unmarkBillPaid(client: ApiClient, billId: string, month: string): Promise<void> {
  const response = await client.request(`/bills/${billId}/payments/${encodeURIComponent(month)}`, { method: "DELETE" });
  if (!response.ok) {
    await throwApiError(response, "bills_unmark_paid_failed");
  }
}
