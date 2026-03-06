/// <reference lib="webworker" />
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from "workbox-precaching";
import { NavigationRoute, registerRoute } from "workbox-routing";
import { NetworkFirst, NetworkOnly } from "workbox-strategies";
import { CacheableResponsePlugin } from "workbox-cacheable-response";
import { ExpirationPlugin } from "workbox-expiration";
import type { PrecacheEntry } from "workbox-precaching";

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<string | PrecacheEntry>;
};

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

registerRoute(
  new NavigationRoute(createHandlerBoundToURL("/index.html"), {
    denylist: [/^\/api\//]
  })
);

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

registerRoute(
  ({ url }) =>
    url.pathname.startsWith("/api/auth/")
    || url.pathname === "/api/me"
    || url.pathname === "/api/token"
    || url.pathname === "/api/refresh",
  new NetworkOnly()
);

registerRoute(
  ({ url, request }) => request.method === "GET" && url.pathname.startsWith("/api/"),
  new NetworkFirst({
    cacheName: "api-cache",
    networkTimeoutSeconds: 5,
    plugins: [
      new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 }),
      new CacheableResponsePlugin({ statuses: [0, 200] })
    ]
  })
);

self.addEventListener("push", (event: PushEvent) => {
  if (!event.data) {
    return;
  }
  type PushAction = {
    action: string;
    title: string;
    icon?: string;
  };
  const payload = event.data.json() as {
    title: string;
    body?: string;
    icon?: string;
    badge?: string;
    tag?: string;
    renotify?: boolean;
    data?: unknown;
    actions?: PushAction[];
  };
  const notificationOptions: NotificationOptions & {
    renotify?: boolean;
    actions?: PushAction[];
  } = {
    body: payload.body,
    icon: payload.icon ?? "/pwa-192x192.png",
    badge: payload.badge ?? "/masked-icon.svg",
    tag: payload.tag,
    renotify: payload.renotify ?? false,
    data: payload.data,
    actions: payload.actions ?? []
  };
  event.waitUntil(
    self.registration.showNotification(payload.title, notificationOptions)
  );
});

self.addEventListener("notificationclick", (event: NotificationEvent) => {
  event.notification.close();

  const action = event.action;
  const data = (event.notification.data ?? {}) as { url?: string };
  const baseUrl = data.url ?? "/app/bills";

  if (action === "dismiss") {
    return;
  }

  const targetUrl = action === "mark_paid" ? `${baseUrl}&action=pay` : baseUrl;
  event.waitUntil(openOrFocusWindow(targetUrl));
});

async function openOrFocusWindow(url: string): Promise<void> {
  const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
  const existing = clients.find((client) => client.url.startsWith(self.location.origin));
  if (existing) {
    await existing.focus();
    await (existing as WindowClient).navigate(url);
    return;
  }
  await self.clients.openWindow(url);
}
