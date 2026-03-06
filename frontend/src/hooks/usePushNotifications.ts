import { useState } from "react";

import { getVapidPublicKey, subscribePush, unsubscribePush } from "@/api/push";
import { useAuth } from "@/auth/useAuth";
import { urlBase64ToUint8Array } from "@/lib/vapid";

export type PushPermission = "default" | "granted" | "denied" | "unsupported";

type PushSubscriptionJson = {
  endpoint?: string;
  keys?: {
    p256dh?: string;
    auth?: string;
  };
};

export function usePushNotifications() {
  const { apiClient } = useAuth();
  const [permission, setPermission] = useState<PushPermission>(() => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      return "unsupported";
    }
    return Notification.permission as PushPermission;
  });
  const [loading, setLoading] = useState(false);

  async function requestAndSubscribe(): Promise<void> {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      return;
    }

    setLoading(true);
    try {
      const requestedPermission = await Notification.requestPermission();
      setPermission(requestedPermission as PushPermission);
      if (requestedPermission !== "granted") {
        return;
      }

      const { public_key } = await getVapidPublicKey(apiClient);
      const registration = await navigator.serviceWorker.ready;
      const existing = await registration.pushManager.getSubscription();
      const subscription = existing ?? await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(public_key)
      });

      const serialized = subscription.toJSON() as PushSubscriptionJson;
      if (!serialized.endpoint || !serialized.keys?.p256dh || !serialized.keys.auth) {
        throw new Error("push_subscription_invalid");
      }

      await subscribePush(apiClient, {
        endpoint: serialized.endpoint,
        keys: {
          p256dh: serialized.keys.p256dh,
          auth: serialized.keys.auth
        },
        user_agent: navigator.userAgent
      });
    } finally {
      setLoading(false);
    }
  }

  async function unsubscribe(): Promise<void> {
    if (!("serviceWorker" in navigator)) {
      return;
    }
    setLoading(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        return;
      }
      await unsubscribePush(apiClient, subscription.endpoint);
      await subscription.unsubscribe();
      setPermission("default");
    } finally {
      setLoading(false);
    }
  }

  return {
    permission,
    loading,
    requestAndSubscribe,
    unsubscribe
  };
}
