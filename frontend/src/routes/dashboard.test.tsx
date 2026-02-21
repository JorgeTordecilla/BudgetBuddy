import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import Dashboard from "@/routes/Dashboard";

describe("Dashboard", () => {
  it("renders authenticated placeholder content", () => {
    render(<Dashboard />);
    expect(screen.getByRole("heading", { name: "Dashboard" })).toBeInTheDocument();
    expect(screen.getByText("Authenticated content placeholder.")).toBeInTheDocument();
  });
});

