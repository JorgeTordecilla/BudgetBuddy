import { describe, expect, it } from "vitest";

import { ApiProblemError, ApiUnknownError } from "@/api/errors";
import { resolveProblemUi } from "@/api/problemMapping";

describe("resolveProblemUi", () => {
  it("maps known problem types with presentation", () => {
    const error = new ApiProblemError(
      {
        type: "https://api.budgetbuddy.dev/problems/invalid-date-range",
        title: "Invalid date range",
        status: 400,
        detail: "From must be before To"
      },
      { httpStatus: 400, requestId: "req-10", retryAfter: null }
    );

    const ui = resolveProblemUi(error);
    expect(ui.message).toContain("Invalid date range");
    expect(ui.presentation).toBe("inline");
    expect(ui.detail).toBe("From must be before To");
    expect(ui.requestId).toBe("req-10");
  });

  it("uses fallback for unknown problem types", () => {
    const error = new ApiProblemError(
      {
        type: "https://api.budgetbuddy.dev/problems/unknown",
        title: "Some unknown problem",
        status: 400,
        detail: "secret stack trace"
      },
      { httpStatus: 400, requestId: null, retryAfter: null }
    );
    const ui = resolveProblemUi(error);
    expect(ui.message).toBe("Unexpected error. Please retry.");
    expect(ui.presentation).toBe("toast");
    expect(ui.detail).toBeNull();
  });

  it("maps unknown http errors to generic toast", () => {
    const ui = resolveProblemUi(
      new ApiUnknownError("backend_failed", { httpStatus: 500, requestId: "req-11", retryAfter: null })
    );
    expect(ui.message).toBe("Unexpected error. Please retry.");
    expect(ui.presentation).toBe("toast");
    expect(ui.requestId).toBe("req-11");
  });
});
