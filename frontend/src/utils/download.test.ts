import { describe, expect, it, vi } from "vitest";

import { downloadBlob, resolveCsvFilename } from "@/utils/download";

describe("download utils", () => {
  it("resolves filename from content-disposition utf8", () => {
    const name = resolveCsvFilename("attachment; filename*=UTF-8''budgetbuddy-export.csv");
    expect(name).toBe("budgetbuddy-export.csv");
  });

  it("resolves quoted filename", () => {
    const name = resolveCsvFilename("attachment; filename=\"transactions.csv\"");
    expect(name).toBe("transactions.csv");
  });

  it("falls back to deterministic timestamp format", () => {
    const now = new Date("2026-02-27T15:08:00Z");
    const name = resolveCsvFilename(null, now);
    expect(name).toMatch(/^budgetbuddy-transactions-\d{8}-\d{4}\.csv$/);
  });

  it("downloads blob through object URL and anchor click", () => {
    const createObjectURL = vi.fn(() => "blob:mock");
    const revokeObjectURL = vi.fn();
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);

    vi.stubGlobal("URL", {
      ...URL,
      createObjectURL,
      revokeObjectURL
    });

    downloadBlob(new Blob(["a,b\n1,2"], { type: "text/csv" }), "transactions.csv");

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:mock");

    clickSpy.mockRestore();
    vi.unstubAllGlobals();
  });
});
