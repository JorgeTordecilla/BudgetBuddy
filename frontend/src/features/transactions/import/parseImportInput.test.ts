import { describe, expect, it } from "vitest";

import { parseImportInput } from "@/features/transactions/import/parseImportInput";

describe("parseImportInput", () => {
  it("parses Format A object input", () => {
    const result = parseImportInput(
      JSON.stringify({
        mode: "partial",
        items: [
          {
            type: "expense",
            account_id: "a1",
            category_id: "c1",
            amount_cents: 1200,
            date: "2026-02-01"
          }
        ]
      }),
      "all_or_nothing"
    );

    expect(result.ok).toBe(true);
    expect(result.payload?.mode).toBe("partial");
    expect(result.payload?.items).toHaveLength(1);
  });

  it("parses Format B array input and applies selected mode", () => {
    const result = parseImportInput(
      JSON.stringify([
        {
          type: "income",
          account_id: "a1",
          category_id: "c2",
          amount_cents: 3000,
          date: "2026-02-02"
        }
      ]),
      "all_or_nothing"
    );

    expect(result.ok).toBe(true);
    expect(result.payload?.mode).toBe("all_or_nothing");
  });

  it("rejects invalid JSON", () => {
    const result = parseImportInput("{ invalid", "partial");
    expect(result.ok).toBe(false);
    expect(result.errors).toContain("Invalid JSON input.");
  });

  it("rejects empty items", () => {
    const result = parseImportInput(JSON.stringify([]), "partial");
    expect(result.ok).toBe(false);
    expect(result.errors).toContain("items must contain at least one transaction.");
  });

  it("validates required fields and value formats", () => {
    const result = parseImportInput(
      JSON.stringify([
        {
          type: "other",
          account_id: "",
          amount_cents: 0,
          date: "2026/01/01"
        }
      ]),
      "partial"
    );

    expect(result.ok).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        "Item 0: type must be income or expense.",
        "Item 0: account_id is required.",
        "Item 0: category_id is required.",
        "Item 0: amount_cents must be an integer greater than zero.",
        "Item 0: date must use YYYY-MM-DD format."
      ])
    );
  });

  it("rejects object input without items array", () => {
    const result = parseImportInput(JSON.stringify({ mode: "partial" }), "partial");
    expect(result.ok).toBe(false);
    expect(result.errors).toContain("Input object must include an items array.");
  });

  it("rejects object input with invalid mode", () => {
    const result = parseImportInput(
      JSON.stringify({
        mode: "invalid_mode",
        items: [
          {
            type: "expense",
            account_id: "a1",
            category_id: "c1",
            amount_cents: 100,
            date: "2026-02-01"
          }
        ]
      }),
      "partial"
    );
    expect(result.ok).toBe(false);
    expect(result.errors).toContain("mode must be partial or all_or_nothing.");
  });

  it("rejects non-array/non-object root JSON", () => {
    const result = parseImportInput("123", "partial");
    expect(result.ok).toBe(false);
    expect(result.errors).toContain("Input must be a JSON array or object.");
  });

  it("produces non-blocking warning for large valid payload", () => {
    const result = parseImportInput(
      JSON.stringify([
        {
          type: "expense",
          account_id: "a1",
          category_id: "c1",
          amount_cents: 100,
          date: "2026-02-01",
          note: "x".repeat(1_600_000)
        }
      ]),
      "partial"
    );
    expect(result.ok).toBe(true);
    expect(result.warning).toBe("Input is large and may take longer to import.");
  });
});
