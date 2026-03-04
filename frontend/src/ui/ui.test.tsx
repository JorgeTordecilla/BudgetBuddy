import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Button } from "@/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/ui/card";
import { Calendar } from "@/ui/calendar";

describe("ui primitives", () => {
  it("renders Button with variants", () => {
    render(<Button variant="outline">Run</Button>);
    const button = screen.getByRole("button", { name: "Run" });
    expect(button).toHaveClass("border");
  });

  it("renders Button as child slot", () => {
    render(
      <Button asChild>
        <a href="/app">Open app</a>
      </Button>
    );
    expect(screen.getByRole("link", { name: "Open app" })).toBeInTheDocument();
  });

  it("renders Card family components", () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Title</CardTitle>
          <CardDescription>Desc</CardDescription>
        </CardHeader>
        <CardContent>Body</CardContent>
      </Card>
    );

    expect(screen.getByText("Title")).toBeInTheDocument();
    expect(screen.getByText("Desc")).toBeInTheDocument();
    expect(screen.getByText("Body")).toBeInTheDocument();
  });

  it("renders Calendar with default shell classes", () => {
    const { container } = render(
      <Calendar mode="single" month={new Date(2026, 1, 1)} selected={new Date(2026, 1, 10)} onSelect={() => undefined} />
    );

    expect(container.querySelector('[role="grid"]')).toBeInTheDocument();
    expect(container.firstElementChild).toHaveClass("p-1");
  });
});
