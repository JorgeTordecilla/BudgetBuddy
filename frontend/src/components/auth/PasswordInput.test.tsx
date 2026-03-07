import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import PasswordInput from "@/components/auth/PasswordInput";

describe("PasswordInput", () => {
  it("renders password input by default", () => {
    render(<PasswordInput placeholder="Password" />);
    expect(screen.getByPlaceholderText("Password")).toHaveAttribute("type", "password");
    expect(screen.getByRole("button", { name: "Show password" })).toHaveAttribute("tabindex", "-1");
  });

  it("toggles between password and text", () => {
    render(<PasswordInput placeholder="Password" />);
    const input = screen.getByPlaceholderText("Password");

    fireEvent.click(screen.getByRole("button", { name: "Show password" }));
    expect(input).toHaveAttribute("type", "text");
    expect(screen.getByRole("button", { name: "Hide password" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Hide password" }));
    expect(input).toHaveAttribute("type", "password");
    expect(screen.getByRole("button", { name: "Show password" })).toBeInTheDocument();
  });

  it("passes input props through to underlying input", () => {
    const onChange = vi.fn();
    render(
      <PasswordInput
        placeholder="Password"
        name="password"
        required
        autoComplete="current-password"
        autoFocus
        value="secret"
        onChange={onChange}
      />
    );

    const input = screen.getByPlaceholderText("Password");
    expect(input).toHaveAttribute("name", "password");
    expect(input).toHaveAttribute("autocomplete", "current-password");
    expect(input).toHaveAttribute("required");
    expect(input).toHaveAttribute("value", "secret");
    expect(input).toHaveFocus();

    fireEvent.change(input, { target: { value: "secret2" } });
    expect(onChange).toHaveBeenCalledTimes(1);
  });
});
