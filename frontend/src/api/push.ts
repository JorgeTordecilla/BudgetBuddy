import type { ApiClient } from "@/api/client";
import { throwApiError } from "@/api/errors";

export type PushSubscribePayload = {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  user_agent?: string;
};

export type PushSubscribeResponse = {
  subscribed: boolean;
  endpoint: string;
};

export type VapidPublicKeyResponse = {
  public_key: string;
};

export async function getVapidPublicKey(client: ApiClient): Promise<VapidPublicKeyResponse> {
  const response = await client.requestPublic("/push/vapid-public-key", { method: "GET" });
  if (!response.ok) {
    await throwApiError(response, "push_vapid_key_failed");
  }
  return (await response.json()) as VapidPublicKeyResponse;
}

export async function subscribePush(client: ApiClient, payload: PushSubscribePayload): Promise<PushSubscribeResponse> {
  const response = await client.request("/push/subscribe", {
    method: "POST",
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    await throwApiError(response, "push_subscribe_failed");
  }
  return (await response.json()) as PushSubscribeResponse;
}

export async function unsubscribePush(client: ApiClient, endpoint: string): Promise<void> {
  const response = await client.request("/push/unsubscribe", {
    method: "DELETE",
    body: JSON.stringify({ endpoint })
  });
  if (!response.ok) {
    await throwApiError(response, "push_unsubscribe_failed");
  }
}
