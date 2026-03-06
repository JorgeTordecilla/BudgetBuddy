import { useMemo, useState } from "react";

import { usePushNotifications } from "@/hooks/usePushNotifications";
import { Button } from "@/ui/button";

const SESSION_COUNT_KEY = "pwa_session_count";
const DEFER_UNTIL_KEY = "push_defer_until";
const MIN_SESSIONS = 3;
const DEFER_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function shouldShowBanner(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  const sessions = Number.parseInt(localStorage.getItem(SESSION_COUNT_KEY) ?? "0", 10);
  const deferUntil = Number.parseInt(localStorage.getItem(DEFER_UNTIL_KEY) ?? "0", 10);
  if (sessions < MIN_SESSIONS) {
    return false;
  }
  if (Number.isFinite(deferUntil) && deferUntil > Date.now()) {
    return false;
  }
  return true;
}

export default function PushPermissionRequest() {
  const [dismissed, setDismissed] = useState(false);
  const { permission, loading, requestAndSubscribe } = usePushNotifications();
  const visible = useMemo(() => permission === "default" && !dismissed && shouldShowBanner(), [dismissed, permission]);

  if (!visible) {
    return null;
  }

  function handleDefer(): void {
    localStorage.setItem(DEFER_UNTIL_KEY, String(Date.now() + DEFER_DAYS_MS));
    setDismissed(true);
  }

  return (
    <div
      role="banner"
      aria-label="Enable reminders"
      className="mb-4 rounded-xl border border-border bg-card px-4 py-3 shadow-sm"
    >
      <p className="text-sm font-semibold text-foreground">Enable bill reminders</p>
      <p className="mt-1 text-xs text-muted-foreground">Get notified on due date and three days before.</p>
      <div className="mt-3 flex items-center gap-2">
        <Button type="button" size="sm" onClick={() => void requestAndSubscribe()} disabled={loading}>
          {loading ? "Activating..." : "Enable"}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={handleDefer}>
          Not now
        </Button>
      </div>
    </div>
  );
}
