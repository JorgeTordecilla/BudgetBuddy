import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const pushMocks = vi.hoisted(() => ({
  getVapidPublicKey: vi.fn(),
  subscribePush: vi.fn(),
  unsubscribePush: vi.fn()
}));

vi.mock("@/auth/useAuth", () => ({
  useAuth: () => ({ apiClient: {} })
}));

vi.mock("@/api/push", () => ({
  getVapidPublicKey: pushMocks.getVapidPublicKey,
  subscribePush: pushMocks.subscribePush,
  unsubscribePush: pushMocks.unsubscribePush
}));

import { usePushNotifications } from "@/hooks/usePushNotifications";

type MockPushSubscription = {
  endpoint: string;
  toJSON: () => {
    endpoint: string;
    keys: {
      p256dh: string;
      auth: string;
    };
  };
  unsubscribe: () => Promise<void>;
};

describe("usePushNotifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("requests permission and subscribes with VAPID key", async () => {
    const subscription: MockPushSubscription = {
      endpoint: "https://push.example/sub",
      toJSON: () => ({
        endpoint: "https://push.example/sub",
        keys: { p256dh: "pkey", auth: "akey" }
      }),
      unsubscribe: vi.fn(async () => undefined)
    };

    pushMocks.getVapidPublicKey.mockResolvedValue({ public_key: "abc123" });
    pushMocks.subscribePush.mockResolvedValue({ subscribed: true, endpoint: "https://push.example/sub" });

    Object.defineProperty(window, "Notification", {
      configurable: true,
      value: {
        permission: "default",
        requestPermission: vi.fn(async () => "granted")
      }
    });
    Object.defineProperty(window, "PushManager", {
      configurable: true,
      value: function PushManager() {
        return undefined;
      }
    });

    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: {
        ready: Promise.resolve({
          pushManager: {
            getSubscription: vi.fn(async () => null),
            subscribe: vi.fn(async () => subscription)
          }
        })
      }
    });

    const { result } = renderHook(() => usePushNotifications());
    await act(async () => {
      await result.current.requestAndSubscribe();
    });

    await waitFor(() => {
      expect(pushMocks.getVapidPublicKey).toHaveBeenCalledTimes(1);
      expect(pushMocks.subscribePush).toHaveBeenCalledTimes(1);
    });
    expect(result.current.permission).toBe("granted");
  });

  it("unsubscribes both backend and browser subscription", async () => {
    const subscription: MockPushSubscription = {
      endpoint: "https://push.example/sub",
      toJSON: () => ({
        endpoint: "https://push.example/sub",
        keys: { p256dh: "pkey", auth: "akey" }
      }),
      unsubscribe: vi.fn(async () => undefined)
    };

    Object.defineProperty(window, "Notification", {
      configurable: true,
      value: {
        permission: "granted",
        requestPermission: vi.fn(async () => "granted")
      }
    });
    Object.defineProperty(window, "PushManager", {
      configurable: true,
      value: function PushManager() {
        return undefined;
      }
    });

    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: {
        ready: Promise.resolve({
          pushManager: {
            getSubscription: vi.fn(async () => subscription),
            subscribe: vi.fn(async () => subscription)
          }
        })
      }
    });

    const { result } = renderHook(() => usePushNotifications());
    await act(async () => {
      await result.current.unsubscribe();
    });

    await waitFor(() => {
      expect(pushMocks.unsubscribePush).toHaveBeenCalledWith(expect.any(Object), "https://push.example/sub");
    });
    expect(subscription.unsubscribe).toHaveBeenCalledTimes(1);
    expect(result.current.permission).toBe("default");
  });

  it("stops when permission is denied", async () => {
    pushMocks.getVapidPublicKey.mockResolvedValue({ public_key: "abc123" });

    Object.defineProperty(window, "Notification", {
      configurable: true,
      value: {
        permission: "default",
        requestPermission: vi.fn(async () => "denied")
      }
    });
    Object.defineProperty(window, "PushManager", {
      configurable: true,
      value: function PushManager() {
        return undefined;
      }
    });
    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: {
        ready: Promise.resolve({
          pushManager: {
            getSubscription: vi.fn(async () => null),
            subscribe: vi.fn()
          }
        })
      }
    });

    const { result } = renderHook(() => usePushNotifications());
    await act(async () => {
      await result.current.requestAndSubscribe();
    });

    expect(pushMocks.getVapidPublicKey).not.toHaveBeenCalled();
    expect(pushMocks.subscribePush).not.toHaveBeenCalled();
    expect(result.current.permission).toBe("denied");
  });

  it("returns early when unsubscribing without active subscription", async () => {
    Object.defineProperty(window, "Notification", {
      configurable: true,
      value: {
        permission: "granted",
        requestPermission: vi.fn(async () => "granted")
      }
    });
    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: {
        ready: Promise.resolve({
          pushManager: {
            getSubscription: vi.fn(async () => null),
            subscribe: vi.fn()
          }
        })
      }
    });

    const { result } = renderHook(() => usePushNotifications());
    await act(async () => {
      await result.current.unsubscribe();
    });

    expect(pushMocks.unsubscribePush).not.toHaveBeenCalled();
  });
});
