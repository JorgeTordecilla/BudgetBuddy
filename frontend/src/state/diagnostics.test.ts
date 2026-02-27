import { describe, expect, it } from "vitest";

import {
  getDiagnosticsSnapshot,
  resetDiagnosticsState,
  setLastProblemType,
  setLastRequestId
} from "@/state/diagnostics";

describe("diagnostics state", () => {
  it("stores latest request id and problem metadata", () => {
    resetDiagnosticsState();
    setLastRequestId("req-10");
    setLastProblemType("https://api.budgetbuddy.dev/problems/forbidden", "req-10");

    const snapshot = getDiagnosticsSnapshot();
    expect(snapshot.lastRequestId).toBe("req-10");
    expect(snapshot.lastProblemType).toBe("https://api.budgetbuddy.dev/problems/forbidden");
    expect(snapshot.lastPath).toBe(window.location.pathname);
    expect(snapshot.lastTimestamp).toBeTruthy();
  });
});
