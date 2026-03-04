import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import PageSkeleton from "@/components/ui/PageSkeleton";

describe("PageSkeleton", () => {
  it("renders accessible loading state", () => {
    render(<PageSkeleton title="Loading analytics..." />);

    expect(screen.getByRole("status", { name: "Loading analytics..." })).toBeInTheDocument();
  });
});
