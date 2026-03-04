import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import BillForm, { type BillFormState } from "@/components/bills/BillForm";

const BASE_STATE: BillFormState = {
  name: "Electricity",
  dueDay: "28",
  budget: "200000",
  accountId: "acc_1",
  categoryId: "cat_1",
  note: "",
  isActive: true
};

describe("BillForm", () => {
  it("renders budget error + problem inline and propagates field changes", () => {
    const onFieldChange = vi.fn();

    render(
      <BillForm
        open
        submitting={false}
        editing={false}
        state={BASE_STATE}
        fieldErrors={{ budget: "Budget invalid." }}
        problem={new Error("problem")}
        accounts={[{ id: "acc_1", name: "Main", type: "cash", initial_balance_cents: 0, archived_at: null }]}
        categories={[
          { id: "cat_1", name: "Utilities", type: "expense", archived_at: null },
          { id: "cat_2", name: "Salary", type: "income", archived_at: null }
        ]}
        onClose={vi.fn()}
        onSubmit={(event) => event.preventDefault()}
        onFieldChange={onFieldChange}
      />
    );

    expect(screen.getByText("Budget invalid.")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Bill account"), { target: { value: "acc_1" } });
    fireEvent.change(screen.getByLabelText("Bill category"), { target: { value: "cat_1" } });
    fireEvent.click(screen.getByRole("checkbox"));

    expect(onFieldChange).toHaveBeenCalledWith("accountId", "acc_1");
    expect(onFieldChange).toHaveBeenCalledWith("categoryId", "cat_1");
    expect(onFieldChange).toHaveBeenCalledWith("isActive", false);
  });
});
