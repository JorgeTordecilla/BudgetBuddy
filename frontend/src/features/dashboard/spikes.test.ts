import { describe, expect, it } from "vitest";

import { computeMedianCents, detectSpendingSpikes } from "@/features/dashboard/spikes";
import type { Transaction } from "@/api/types";

function makeExpense(id: string, amount: number): Transaction {
  return {
    id,
    type: "expense",
    account_id: "a1",
    category_id: "c1",
    amount_cents: amount,
    date: "2026-02-01",
    merchant: "Shop",
    note: null,
    archived_at: null,
    created_at: "2026-02-01T00:00:00Z",
    updated_at: "2026-02-01T00:00:00Z"
  };
}

describe("dashboard spikes", () => {
  it("computes odd-sized median", () => {
    const rows = [makeExpense("1", 100), makeExpense("2", 300), makeExpense("3", 200)];
    expect(computeMedianCents(rows)).toBe(200);
  });

  it("computes even-sized median using rounded midpoint", () => {
    const rows = [makeExpense("1", 100), makeExpense("2", 300), makeExpense("3", 200), makeExpense("4", 401)];
    expect(computeMedianCents(rows)).toBe(250);
  });

  it("returns insufficientData when sample is below threshold", () => {
    const rows = [makeExpense("1", 1000), makeExpense("2", 2000)];
    const result = detectSpendingSpikes(rows, { minSampleSize: 3 });
    expect(result.insufficientData).toBe(true);
    expect(result.spikes).toEqual([]);
  });

  it("detects spikes using multiplier and minimum absolute threshold", () => {
    const rows = [
      makeExpense("1", 10000),
      makeExpense("2", 11000),
      makeExpense("3", 12000),
      makeExpense("4", 13000),
      makeExpense("5", 14000),
      makeExpense("6", 15000),
      makeExpense("7", 16000),
      makeExpense("8", 17000),
      makeExpense("9", 60000)
    ];
    const result = detectSpendingSpikes(rows, { minSpikeCents: 50000, minSampleSize: 8, multiplier: 3 });
    expect(result.insufficientData).toBe(false);
    expect(result.spikes.map((spike) => spike.id)).toEqual(["9"]);
  });
});

