import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import ProblemDetailsToast from "@/components/errors/ProblemDetailsToast";
import { publishProblemToast } from "@/components/errors/problemToastStore";

describe("ProblemDetailsToast", () => {
  it("renders toast with request id and copy action", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    render(<ProblemDetailsToast />);
    publishProblemToast({
      message: "Too many requests. Try again in a moment.",
      detail: null,
      presentation: "toast",
      requestId: "req-toast",
      status: 429,
      type: "https://api.budgetbuddy.dev/problems/rate-limited",
      retryAfter: "30"
    });

    expect(await screen.findByText("Too many requests. Try again in a moment.")).toBeInTheDocument();
    expect(screen.getByText("Retry-After: 30s")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Copy" }));
    expect(writeText).toHaveBeenCalledWith("req-toast");
  });
});

