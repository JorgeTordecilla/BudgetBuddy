import type { ApiClient } from "@/api/client";
import { throwApiError } from "@/api/errors";
import type { RolloverApplyRequest, RolloverApplyResponse, RolloverPreview } from "@/api/types";

export async function getRolloverPreview(client: ApiClient, month: string): Promise<RolloverPreview> {
  const search = new URLSearchParams();
  search.set("month", month);
  const response = await client.request(`/rollover/preview?${search.toString()}`, { method: "GET" });
  if (!response.ok) {
    await throwApiError(response, "rollover_preview_failed");
  }
  return (await response.json()) as RolloverPreview;
}

export async function applyRollover(client: ApiClient, payload: RolloverApplyRequest): Promise<RolloverApplyResponse> {
  const response = await client.request("/rollover/apply", {
    method: "POST",
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    await throwApiError(response, "rollover_apply_failed");
  }
  return (await response.json()) as RolloverApplyResponse;
}
