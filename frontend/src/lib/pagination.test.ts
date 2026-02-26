import { describe, expect, it } from "vitest";

import { appendCursorPage, type CursorPage } from "@/lib/pagination";

type Row = { id: string };

describe("pagination helpers", () => {
  it("appends next page items and updates cursor", () => {
    const first: CursorPage<Row> = { items: [{ id: "1" }, { id: "2" }], nextCursor: "cursor-2" };
    const second: CursorPage<Row> = { items: [{ id: "3" }], nextCursor: null };

    const merged = appendCursorPage(first, second);

    expect(merged.items.map((item) => item.id)).toEqual(["1", "2", "3"]);
    expect(merged.nextCursor).toBeNull();
  });

  it("supports reset behavior by using a fresh previous page", () => {
    const resetBase: CursorPage<Row> = { items: [], nextCursor: null };
    const filtered: CursorPage<Row> = { items: [{ id: "9" }], nextCursor: "cursor-9" };

    const merged = appendCursorPage(resetBase, filtered);

    expect(merged.items.map((item) => item.id)).toEqual(["9"]);
    expect(merged.nextCursor).toBe("cursor-9");
  });
});
