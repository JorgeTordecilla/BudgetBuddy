import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useOnlineStatus } from "@/hooks/useOnlineStatus";

function setOnlineState(value: boolean) {
  Object.defineProperty(navigator, "onLine", {
    configurable: true,
    get: () => value
  });
}

describe("useOnlineStatus", () => {
  it("reflects browser online/offline events", () => {
    setOnlineState(true);
    const { result } = renderHook(() => useOnlineStatus());

    expect(result.current).toBe(true);

    setOnlineState(false);
    act(() => {
      window.dispatchEvent(new Event("offline"));
    });
    expect(result.current).toBe(false);

    setOnlineState(true);
    act(() => {
      window.dispatchEvent(new Event("online"));
    });
    expect(result.current).toBe(true);
  });
});
