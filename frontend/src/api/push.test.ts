import { describe, expect, it, vi } from "vitest";

import { createApiClient } from "@/api/client";
import { getVapidPublicKey, subscribePush, unsubscribePush } from "@/api/push";

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

describe("push api wrappers", () => {
  it("gets vapid key via public request", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ public_key: "abc123" }), {
        status: 200,
        headers: { "content-type": "application/json" }
      })
    );
    const client = makeClient(fetchMock);

    const payload = await getVapidPublicKey(client);
    expect(payload.public_key).toBe("abc123");
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("/push/vapid-public-key");
    expect(fetchMock.mock.calls[0]?.[1]?.method).toBe("GET");
  });

  it("subscribes and unsubscribes push endpoint", async () => {
    const fetchMock = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ subscribed: true, endpoint: "https://push.example/sub" }), {
          status: 201,
          headers: { "content-type": "application/json" }
        })
      )
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    const client = makeClient(fetchMock);

    const subscribeResponse = await subscribePush(client, {
      endpoint: "https://push.example/sub",
      keys: { p256dh: "k1", auth: "k2" },
      user_agent: "ua"
    });
    expect(subscribeResponse.subscribed).toBe(true);
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("/push/subscribe");
    expect(fetchMock.mock.calls[0]?.[1]?.method).toBe("POST");

    await unsubscribePush(client, "https://push.example/sub");
    expect(String(fetchMock.mock.calls[1]?.[0])).toContain("/push/unsubscribe");
    expect(fetchMock.mock.calls[1]?.[1]?.method).toBe("DELETE");
  });

  it("throws when vapid endpoint fails", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({
        type: "https://budgetbuddy.app/problems/push-vapid-key-failed",
        title: "Push VAPID key failed",
        status: 500,
        detail: "failed",
        code: "push-vapid-key-failed",
        request_id: "req-1"
      }), {
        status: 500,
        headers: { "content-type": "application/problem+json" }
      })
    );
    const client = makeClient(fetchMock);
    await expect(getVapidPublicKey(client)).rejects.toBeInstanceOf(Error);
  });

  it("throws when subscribe fails", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({
        type: "https://budgetbuddy.app/problems/push-subscribe-failed",
        title: "Push subscribe failed",
        status: 400,
        detail: "invalid",
        code: "push-subscribe-failed",
        request_id: "req-2"
      }), {
        status: 400,
        headers: { "content-type": "application/problem+json" }
      })
    );
    const client = makeClient(fetchMock);
    await expect(
      subscribePush(client, {
        endpoint: "https://push.example/sub",
        keys: { p256dh: "k1", auth: "k2" }
      })
    ).rejects.toBeInstanceOf(Error);
  });

  it("throws when unsubscribe fails", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({
        type: "https://budgetbuddy.app/problems/push-unsubscribe-failed",
        title: "Push unsubscribe failed",
        status: 401,
        detail: "unauthorized",
        code: "push-unsubscribe-failed",
        request_id: "req-3"
      }), {
        status: 401,
        headers: { "content-type": "application/problem+json" }
      })
    );
    const client = makeClient(fetchMock);
    await expect(unsubscribePush(client, "https://push.example/sub")).rejects.toBeInstanceOf(Error);
  });
});
