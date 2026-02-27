import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ApiProblemError } from "@/api/errors";
import ProblemDetailsInline from "@/components/errors/ProblemDetailsInline";

describe("ProblemDetailsInline", () => {
  it("renders message, request id, copy, and retry", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    const onRetry = vi.fn();

    render(
      <ProblemDetailsInline
        error={
          new ApiProblemError(
            {
              type: "https://api.budgetbuddy.dev/problems/forbidden",
              title: "Forbidden",
              status: 403
            },
            { httpStatus: 403, requestId: "req-inline", retryAfter: null }
          )
        }
        onRetry={onRetry}
      />
    );

    expect(screen.getByText("You do not have access to this resource.")).toBeInTheDocument();
    expect(screen.getByText("Request ID: req-inline")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Copy" }));
    expect(writeText).toHaveBeenCalledWith("req-inline");
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});

