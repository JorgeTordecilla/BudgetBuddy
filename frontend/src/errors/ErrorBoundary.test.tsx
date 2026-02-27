import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import ErrorBoundary from "@/errors/ErrorBoundary";
import { resetDiagnosticsState, setLastProblemType, setLastRequestId } from "@/state/diagnostics";

function Crash() {
  throw new Error("boom");
  return null;
}

describe("ErrorBoundary", () => {
  beforeEach(() => {
    resetDiagnosticsState();
  });

  it("renders fallback and copies diagnostic info", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    setLastRequestId("req-boundary");
    setLastProblemType("https://api.budgetbuddy.dev/problems/forbidden", "req-boundary");

    render(
      <ErrorBoundary>
        <Crash />
      </ErrorBoundary>
    );

    expect(screen.getByText("Something went wrong")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Copy diagnostic info" }));
    expect(writeText).toHaveBeenCalledTimes(1);
    expect(String(writeText.mock.calls[0]?.[0])).toContain("req-boundary");
    expect(String(writeText.mock.calls[0]?.[0])).toContain("problem_type");
    consoleSpy.mockRestore();
  });
});
