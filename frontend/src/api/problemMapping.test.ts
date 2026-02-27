import { describe, expect, it } from "vitest";

import { ApiProblemError, ApiUnknownError } from "@/api/errors";
import { resolveProblemUi } from "@/api/problemMapping";
import { PROBLEM_TYPE_INVALID_DATE_RANGE, PROBLEM_TYPE_UNAUTHORIZED } from "@/api/problemTypes";

describe("resolveProblemUi", () => {
  it("maps known problem types with presentation", () => {
    const error = new ApiProblemError(
      {
        type: PROBLEM_TYPE_INVALID_DATE_RANGE,
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

  it("maps unauthorized problem to canonical auth message", () => {
    const error = new ApiProblemError(
      {
        type: PROBLEM_TYPE_UNAUTHORIZED,
        title: "Unauthorized",
        status: 401
      },
      { httpStatus: 401, requestId: "req-auth-1", retryAfter: null }
    );

    const ui = resolveProblemUi(error);
    expect(ui.message).toBe("Your session expired. Please sign in again.");
    expect(ui.presentation).toBe("toast");
    expect(ui.requestId).toBe("req-auth-1");
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
