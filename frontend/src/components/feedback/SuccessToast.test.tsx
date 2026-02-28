import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import SuccessToast from "@/components/feedback/SuccessToast";
import { publishSuccessToast } from "@/components/feedback/successToastStore";

describe("SuccessToast", () => {
  it("renders success message after publish", async () => {
    render(<SuccessToast />);
    publishSuccessToast("Your transaction was saved successfully.");

    expect(await screen.findByText("Transaction created")).toBeInTheDocument();
    expect(screen.getByText("Your transaction was saved successfully.")).toBeInTheDocument();
  });
});
