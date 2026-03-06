import { beforeEach, describe, expect, it, vi } from "vitest";

const cleanupOutdatedCachesMock = vi.fn();
const precacheAndRouteMock = vi.fn();
const createHandlerBoundToURLMock = vi.fn(() => vi.fn());
const registerRouteMock = vi.fn();

vi.mock("workbox-precaching", () => ({
  cleanupOutdatedCaches: cleanupOutdatedCachesMock,
  precacheAndRoute: precacheAndRouteMock,
  createHandlerBoundToURL: createHandlerBoundToURLMock
}));

vi.mock("workbox-routing", () => ({
  NavigationRoute: class NavigationRoute {
    handler: unknown;
    options: unknown;
    constructor(handler: unknown, options: unknown) {
      this.handler = handler;
      this.options = options;
    }
  },
  registerRoute: registerRouteMock
}));

vi.mock("workbox-strategies", () => ({
  NetworkFirst: class NetworkFirst {
    constructor(_options: unknown) {}
  },
  NetworkOnly: class NetworkOnly {
    constructor() {}
  }
}));

vi.mock("workbox-cacheable-response", () => ({
  CacheableResponsePlugin: class CacheableResponsePlugin {
    constructor(_options: unknown) {}
  }
}));

vi.mock("workbox-expiration", () => ({
  ExpirationPlugin: class ExpirationPlugin {
    constructor(_options: unknown) {}
  }
}));

type SwListener = (event: any) => void;
type ListenerMap = Record<string, SwListener[]>;

function createSwGlobal() {
  const listeners: ListenerMap = {};
  const showNotification = vi.fn().mockResolvedValue(undefined);
  const matchAll = vi.fn().mockResolvedValue([]);
  const openWindow = vi.fn().mockResolvedValue(undefined);
  const skipWaiting = vi.fn();

  const selfMock = {
    __WB_MANIFEST: [],
    addEventListener: vi.fn((type: string, listener: SwListener) => {
      listeners[type] = listeners[type] ?? [];
      listeners[type].push(listener);
    }),
    registration: { showNotification },
    clients: { matchAll, openWindow },
    location: { origin: "https://budgetbuddy.test" },
    skipWaiting
  };

  return { selfMock, listeners, showNotification, matchAll, openWindow, skipWaiting };
}

async function loadServiceWorker() {
  vi.resetModules();
  const env = createSwGlobal();
  vi.stubGlobal("self", env.selfMock);
  await import("@/sw");
  return env;
}

describe("service worker handlers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows push notification with payload fields and defaults", async () => {
    const { listeners, showNotification } = await loadServiceWorker();
    const pushHandler = listeners.push?.[0];
    expect(pushHandler).toBeTypeOf("function");

    const waitUntil = vi.fn();
    pushHandler?.({
      data: {
        json: () => ({
          title: "Payment due",
          body: "Internet due today",
          data: { url: "/app/bills?highlight=b1" },
          actions: [{ action: "mark_paid", title: "Mark paid" }]
        })
      },
      waitUntil
    });

    expect(showNotification).toHaveBeenCalledWith(
      "Payment due",
      expect.objectContaining({
        body: "Internet due today",
        icon: "/pwa-192x192.png",
        badge: "/masked-icon.svg",
        renotify: false,
        data: { url: "/app/bills?highlight=b1" },
        actions: [{ action: "mark_paid", title: "Mark paid" }]
      })
    );
    expect(waitUntil).toHaveBeenCalledTimes(1);
  });

  it("dismiss action closes notification without navigation", async () => {
    const { listeners, matchAll, openWindow } = await loadServiceWorker();
    const clickHandler = listeners.notificationclick?.[0];
    expect(clickHandler).toBeTypeOf("function");

    const close = vi.fn();
    const waitUntil = vi.fn();
    clickHandler?.({
      action: "dismiss",
      notification: { close, data: { url: "/app/bills?highlight=b1" } },
      waitUntil
    });

    expect(close).toHaveBeenCalledTimes(1);
    expect(waitUntil).not.toHaveBeenCalled();
    expect(matchAll).not.toHaveBeenCalled();
    expect(openWindow).not.toHaveBeenCalled();
  });

  it("mark_paid focuses existing window and navigates with action param", async () => {
    const { listeners, matchAll, openWindow } = await loadServiceWorker();
    const clickHandler = listeners.notificationclick?.[0];
    expect(clickHandler).toBeTypeOf("function");

    const focus = vi.fn().mockResolvedValue(undefined);
    const navigate = vi.fn().mockResolvedValue(undefined);
    matchAll.mockResolvedValueOnce([{ url: "https://budgetbuddy.test/app/dashboard", focus, navigate }]);

    const close = vi.fn();
    const waitUntil = vi.fn();
    clickHandler?.({
      action: "mark_paid",
      notification: { close, data: { url: "/app/bills?highlight=b1" } },
      waitUntil
    });

    expect(waitUntil).toHaveBeenCalledTimes(1);
    await waitUntil.mock.calls[0][0];
    expect(focus).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith("/app/bills?highlight=b1&action=pay");
    expect(openWindow).not.toHaveBeenCalled();
  });

  it("body click focuses existing window and navigates to base url", async () => {
    const { listeners, matchAll, openWindow } = await loadServiceWorker();
    const clickHandler = listeners.notificationclick?.[0];
    expect(clickHandler).toBeTypeOf("function");

    const focus = vi.fn().mockResolvedValue(undefined);
    const navigate = vi.fn().mockResolvedValue(undefined);
    matchAll.mockResolvedValueOnce([{ url: "https://budgetbuddy.test/app/dashboard", focus, navigate }]);

    const close = vi.fn();
    const waitUntil = vi.fn();
    clickHandler?.({
      action: "",
      notification: { close, data: { url: "/app/bills?highlight=b1" } },
      waitUntil
    });

    expect(waitUntil).toHaveBeenCalledTimes(1);
    await waitUntil.mock.calls[0][0];
    expect(focus).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith("/app/bills?highlight=b1");
    expect(openWindow).not.toHaveBeenCalled();
  });
});
