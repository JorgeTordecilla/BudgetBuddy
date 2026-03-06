import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import DatePickerField from "@/components/DatePickerField";

describe("DatePickerField", () => {
  it("keeps internal input unfocused to avoid mobile keyboard artifacts", () => {
    const onChange = vi.fn();
    render(<DatePickerField mode="month" value="2026-03" onChange={onChange} ariaLabel="Month" />);

    const internalInput = screen.getByLabelText("Month", { selector: "input" });
    fireEvent.focus(internalInput);

    expect(internalInput).not.toHaveFocus();
  });
});
