import { describe, expect, it } from "vitest";

import { mapAnalyticsProblem, mapBudgetProblem, mapTransactionProblem } from "@/api/problemMessages";

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

describe("mapBudgetProblem", () => {
  it("maps budget duplicate to deterministic detail", () => {
    const mapped = mapBudgetProblem(
      {
        type: "https://api.budgetbuddy.dev/problems/budget-duplicate",
        title: "Budget already exists",
        status: 409
      },
      409,
      "Failed to save budget"
    );

    expect(mapped.detail).toBe("A budget already exists for that month and category.");
  });

  it("maps category archived and not-owned conflicts to deterministic detail", () => {
    const archived = mapBudgetProblem(
      {
        type: "https://api.budgetbuddy.dev/problems/category-archived",
        title: "Category is archived",
        status: 409
      },
      409,
      "Failed to save budget"
    );
    const notOwned = mapBudgetProblem(
      {
        type: "https://api.budgetbuddy.dev/problems/category-not-owned",
        title: "Category not owned",
        status: 409
      },
      409,
      "Failed to save budget"
    );

    expect(archived.detail).toBe("Selected category is not available. Choose another.");
    expect(notOwned.detail).toBe("Selected category is not available. Choose another.");
  });

  it("maps budget month invalid and money amount errors", () => {
    const monthInvalid = mapBudgetProblem(
      {
        type: "https://api.budgetbuddy.dev/problems/budget-month-invalid",
        title: "",
        status: 400
      },
      400,
      "Failed to save budget"
    );
    const moneyInvalid = mapBudgetProblem(
      {
        type: "https://api.budgetbuddy.dev/problems/money-amount-out-of-range",
        title: "",
        status: 400
      },
      400,
      "Failed to save budget"
    );

    expect(monthInvalid.title).toBe("Invalid month");
    expect(monthInvalid.detail).toBe("Month must use YYYY-MM format.");
    expect(moneyInvalid.title).toBe("Invalid limit");
    expect(moneyInvalid.detail).toBe("Limit must be a positive amount with up to two decimals.");
  });

  it("uses fallback status titles for missing budget problem payload", () => {
    const mapped = mapBudgetProblem(null, 429, "Failed to load budgets");
    expect(mapped.title).toBe("Too Many Requests");
    expect(mapped.status).toBe(429);
  });

  it("maps unauthorized status to canonical title", () => {
    const mapped = mapBudgetProblem(null, 401, "Failed to load budgets");
    expect(mapped.title).toBe("Unauthorized");
    expect(mapped.status).toBe(401);
  });
});

describe("mapAnalyticsProblem", () => {
  it("maps invalid-date-range to deterministic detail", () => {
    const mapped = mapAnalyticsProblem(
      {
        type: "https://api.budgetbuddy.dev/problems/invalid-date-range",
        title: "",
        status: 400
      },
      400,
      "Failed to load analytics"
    );

    expect(mapped.title).toBe("Invalid date range");
    expect(mapped.detail).toBe("The start date must be on or before the end date.");
  });

  it("maps status fallback titles for analytics", () => {
    expect(mapAnalyticsProblem(null, 401, "Failed").title).toBe("Unauthorized");
    expect(mapAnalyticsProblem(null, 406, "Failed").title).toBe("Client contract error");
    expect(mapAnalyticsProblem(null, 429, "Failed").title).toBe("Too Many Requests");
  });
});
