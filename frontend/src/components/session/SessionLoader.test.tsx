import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import SessionLoader from "@/components/session/SessionLoader";

describe("SessionLoader", () => {
  it("renders default checking message", () => {
    render(<SessionLoader />);
    expect(screen.getByText("Checking session...")).toBeInTheDocument();
  });

  it("renders custom message", () => {
    render(<SessionLoader message="Restoring session..." />);
    expect(screen.getByText("Restoring session...")).toBeInTheDocument();
  });
});
