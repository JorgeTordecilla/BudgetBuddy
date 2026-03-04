import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import RouteChunkErrorBoundary from "@/routes/RouteChunkErrorBoundary";

function ThrowMaybe({ shouldThrowRef }: { shouldThrowRef: { current: boolean } }) {
  if (shouldThrowRef.current) {
    throw new Error("chunk failed");
  }
  return <div>Loaded route content</div>;
}

describe("RouteChunkErrorBoundary", () => {
  it("shows retry UI when child throws and recovers on retry", () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    try {
      const shouldThrowRef = { current: true };
      render(
        <RouteChunkErrorBoundary routeName="Analytics">
          <ThrowMaybe shouldThrowRef={shouldThrowRef} />
        </RouteChunkErrorBoundary>
      );

      expect(screen.getByText("Unable to load Analytics")).toBeInTheDocument();
      shouldThrowRef.current = false;
      fireEvent.click(screen.getByRole("button", { name: "Retry" }));

      expect(screen.getByText("Loaded route content")).toBeInTheDocument();
    } finally {
      consoleErrorSpy.mockRestore();
    }
  });
});
