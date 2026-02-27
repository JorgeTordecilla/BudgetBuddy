import { describe, expect, it } from "vitest";

import { ApiNetworkError, ApiProblemError, ApiUnknownError, toApiError } from "@/api/errors";

describe("toApiError", () => {
  it("normalizes problem+json responses", async () => {
    const response = new Response(
      JSON.stringify({
        type: "https://api.budgetbuddy.dev/problems/forbidden",
        title: "Forbidden",
        status: 403,
        detail: "No access"
      }),
      {
        status: 403,
        headers: {
          "content-type": "application/problem+json",
          "x-request-id": "req-1",
          "retry-after": "5"
        }
      }
    );

    const error = await toApiError(response, "fallback");
    expect(error).toBeInstanceOf(ApiProblemError);
    if (error instanceof ApiProblemError) {
      expect(error.problem.type).toContain("forbidden");
      expect(error.requestId).toBe("req-1");
      expect(error.retryAfter).toBe("5");
      expect(error.status).toBe(403);
    }
  });

  it("returns ApiUnknownError for non-problem http errors", async () => {
    const response = new Response("bad", { status: 500 });
    const error = await toApiError(response, "server_failed");
    expect(error).toBeInstanceOf(ApiUnknownError);
    if (error instanceof ApiUnknownError) {
      expect(error.message).toBe("server_failed");
      expect(error.status).toBe(500);
    }
  });

  it("returns ApiNetworkError for fetch TypeError", async () => {
    const error = await toApiError(new TypeError("Failed to fetch"));
    expect(error).toBeInstanceOf(ApiNetworkError);
    if (error instanceof ApiNetworkError) {
      expect(error.message).toContain("Network error");
    }
  });
});

