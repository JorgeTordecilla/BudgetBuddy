import { describe, expect, it } from "vitest";

import { currentIsoMonth, defaultAnalyticsRange, isValidDateRange, isValidIsoDate, monthStartIsoDate, todayIsoDate } from "@/utils/dates";

describe("date helpers", () => {
  it("returns month-start in ISO format", () => {
    const date = new Date(Date.UTC(2026, 1, 14));
    expect(monthStartIsoDate(date)).toBe("2026-02-01");
  });

  it("validates ISO date and date ranges", () => {
    expect(isValidIsoDate("2026/02/28")).toBe(false);
    expect(isValidIsoDate("2026-02-30")).toBe(false);
    expect(isValidIsoDate("2026-02-28")).toBe(true);
    expect(isValidDateRange("2026-02-01", "2026-02-28")).toBe(true);
    expect(isValidDateRange("2026-03-01", "2026-02-28")).toBe(false);
    expect(isValidDateRange("bad", "2026-02-28")).toBe(false);
  });

  it("produces a default analytics range", () => {
    const range = defaultAnalyticsRange();
    expect(range.from).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(range.to).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("uses local date getters instead of UTC getters for defaults", () => {
    const fakeLocalDate = {
      getFullYear: () => 2026,
      getMonth: () => 1,
      getDate: () => 3,
      getUTCFullYear: () => 1999,
      getUTCMonth: () => 10,
      getUTCDate: () => 30
    } as unknown as Date;

    expect(currentIsoMonth(fakeLocalDate)).toBe("2026-02");
    expect(monthStartIsoDate(fakeLocalDate)).toBe("2026-02-01");
    expect(todayIsoDate(fakeLocalDate)).toBe("2026-02-03");
    expect(defaultAnalyticsRange(fakeLocalDate)).toEqual({
      from: "2026-02-01",
      to: "2026-02-03"
    });
  });
});
