import { describe, expect, it } from "vitest";

import { mapTransactionProblem } from "@/api/problemMessages";

describe("mapTransactionProblem", () => {
  it("maps category-type-mismatch to deterministic detail", () => {
    const mapped = mapTransactionProblem(
      {
        type: "https://api.budgetbuddy.dev/problems/category-type-mismatch",
        title: "Conflict",
        status: 409
      },
      409,
      "Failed to save transaction"
    );

    expect(mapped.title).toBe("Conflict");
    expect(mapped.detail).toBe("Transaction type must match category type.");
  });

  it("maps fallback title from status when title is empty", () => {
    const mapped = mapTransactionProblem(
      {
        type: "https://api.budgetbuddy.dev/problems/not-acceptable",
        title: "",
        status: 406
      },
      406,
      "Failed to load transactions"
    );

    expect(mapped.title).toBe("Client contract error");
  });

  it("creates fallback problem when payload is missing", () => {
    const mapped = mapTransactionProblem(null, 400, "Failed to save transaction");
    expect(mapped.title).toBe("Invalid request");
    expect(mapped.status).toBe(400);
  });

  it("maps archived account and category details", () => {
    const accountMapped = mapTransactionProblem(
      {
        type: "https://api.budgetbuddy.dev/problems/account-archived",
        title: "Account archived",
        status: 409
      },
      409,
      "Failed to save transaction"
    );
    const categoryMapped = mapTransactionProblem(
      {
        type: "https://api.budgetbuddy.dev/problems/category-archived",
        title: "Category archived",
        status: 409
      },
      409,
      "Failed to save transaction"
    );

    expect(accountMapped.detail).toBe("Transactions cannot be created on archived accounts.");
    expect(categoryMapped.detail).toBe("Transactions cannot use archived categories.");
  });

  it("falls back to provided title for unknown status with empty title", () => {
    const mapped = mapTransactionProblem(
      {
        type: "about:blank",
        title: "",
        status: 418
      },
      418,
      "Failed to load transactions"
    );
    expect(mapped.title).toBe("Failed to load transactions");
  });
});
