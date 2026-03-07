type StorageLike = Pick<Storage, "getItem" | "setItem">;

const SESSION_COUNT_KEY = "pwa_session_count";

export function incrementPwaSessionCount(storage?: StorageLike): void {
  try {
    const target = storage ?? window.localStorage;
    const sessions = Number.parseInt(target.getItem(SESSION_COUNT_KEY) ?? "0", 10);
    target.setItem(SESSION_COUNT_KEY, String(Number.isNaN(sessions) ? 1 : sessions + 1));
  } catch {
    // Ignore storage failures (for example private-mode restrictions).
  }
}

