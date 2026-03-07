import { describe, expect, it, vi } from "vitest";

import { incrementPwaSessionCount } from "@/lib/pwaSessionCounter";

describe("incrementPwaSessionCount", () => {
  it("increments existing counter", () => {
    const storage = {
      getItem: vi.fn(() => "2"),
      setItem: vi.fn()
    };

    incrementPwaSessionCount(storage);

    expect(storage.setItem).toHaveBeenCalledWith("pwa_session_count", "3");
  });

  it("initializes counter when value is not numeric", () => {
    const storage = {
      getItem: vi.fn(() => "bad"),
      setItem: vi.fn()
    };

    incrementPwaSessionCount(storage);

    expect(storage.setItem).toHaveBeenCalledWith("pwa_session_count", "1");
  });

  it("does not throw when storage access fails", () => {
    const storage = {
      getItem: vi.fn(() => {
        throw new DOMException("blocked", "SecurityError");
      }),
      setItem: vi.fn()
    };

    expect(() => incrementPwaSessionCount(storage)).not.toThrow();
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it("does not throw when window.localStorage getter fails", () => {
    const localStorageGetter = vi.spyOn(window, "localStorage", "get").mockImplementation(() => {
      throw new DOMException("blocked", "SecurityError");
    });

    expect(() => incrementPwaSessionCount()).not.toThrow();

    localStorageGetter.mockRestore();
  });
});
