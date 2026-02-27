import { fireEvent, render, screen } from "@testing-library/react";
import { type FormEvent, useState } from "react";
import { describe, expect, it, vi } from "vitest";

import type { ProblemDetails } from "@/api/types";
import ConfirmDialog from "@/components/ConfirmDialog";
import ModalForm from "@/components/ModalForm";
import PageHeader from "@/components/PageHeader";
import ProblemBanner from "@/components/ProblemBanner";
import TransactionForm, { type TransactionFormState } from "@/components/transactions/TransactionForm";
import TransactionRowActions from "@/components/transactions/TransactionRowActions";

describe("shared components", () => {
  it("renders page header action and content", () => {
    const onAction = vi.fn();
    render(<PageHeader title="Accounts" description="desc" actionLabel="New" onAction={onAction} />);
    fireEvent.click(screen.getByRole("button", { name: "New" }));
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it("does not render action when label or callback is missing", () => {
    render(<PageHeader title="Accounts" description="desc" actionLabel="New" />);
    expect(screen.queryByRole("button", { name: "New" })).not.toBeInTheDocument();
  });

  it("renders custom actions when provided", () => {
    render(<PageHeader title="Accounts" actions={<button type="button">Custom</button>} />);
    expect(screen.getByRole("button", { name: "Custom" })).toBeInTheDocument();
  });

  it("renders title-only page header", () => {
    render(<PageHeader title="Accounts" />);
    expect(screen.getByRole("heading", { name: "Accounts" })).toBeInTheDocument();
    expect(screen.queryByText("desc")).not.toBeInTheDocument();
  });

  it("renders and submits modal form", () => {
    const onSubmit = vi.fn((event: FormEvent) => event.preventDefault());
    const onClose = vi.fn();
    render(
      <ModalForm
        open
        title="Create"
        submitLabel="Save"
        onClose={onClose}
        onSubmit={onSubmit}
      >
        <input aria-label="Name" />
      </ModalForm>
    );

    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.getByRole("dialog")).toHaveAttribute("aria-modal", "true");
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("closes modal form with Escape when not submitting", () => {
    const onClose = vi.fn();
    render(
      <ModalForm
        open
        title="Create"
        submitLabel="Save"
        onClose={onClose}
        onSubmit={() => undefined}
      >
        <input aria-label="Name" />
      </ModalForm>
    );

    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("traps keyboard focus inside modal form", () => {
    render(
      <ModalForm
        open
        title="Create"
        submitLabel="Save"
        onClose={() => undefined}
        onSubmit={() => undefined}
      >
        <input aria-label="Name" />
      </ModalForm>
    );

    const dialog = screen.getByRole("dialog");
    const nameInput = screen.getByLabelText("Name");
    const saveButton = screen.getByRole("button", { name: "Save" });
    expect(nameInput).toHaveFocus();

    fireEvent.keyDown(dialog, { key: "Tab", shiftKey: true });
    expect(saveButton).toHaveFocus();

    fireEvent.keyDown(dialog, { key: "Tab" });
    expect(nameInput).toHaveFocus();
  });

  it("restores focus to trigger when modal form closes", () => {
    function ModalHarness() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button type="button" onClick={() => setOpen(true)}>
            Open modal
          </button>
          <ModalForm
            open={open}
            title="Create"
            submitLabel="Save"
            onClose={() => setOpen(false)}
            onSubmit={() => undefined}
          >
            <input aria-label="Name" />
          </ModalForm>
        </>
      );
    }

    render(<ModalHarness />);

    const trigger = screen.getByRole("button", { name: "Open modal" });
    trigger.focus();
    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(trigger).toHaveFocus();
  });

  it("hides modal form and dialog when closed", () => {
    const { rerender } = render(
      <ModalForm open={false} title="Create" submitLabel="Save" onClose={() => undefined} onSubmit={() => undefined}>
        <div />
      </ModalForm>
    );
    expect(screen.queryByText("Create")).not.toBeInTheDocument();

    rerender(
      <ConfirmDialog
        open={false}
        title="Archive?"
        description="desc"
        onCancel={() => undefined}
        onConfirm={() => undefined}
      />
    );
    expect(screen.queryByText("Archive?")).not.toBeInTheDocument();
  });

  it("confirms dialog action", () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(
      <ConfirmDialog
        open
        title="Archive?"
        description="desc"
        confirmLabel="Archive"
        onCancel={onCancel}
        onConfirm={onConfirm}
      />
    );

    expect(screen.getByRole("dialog")).toHaveAttribute("aria-modal", "true");
    fireEvent.click(screen.getByRole("button", { name: "Archive" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("cancels confirm dialog with Escape when not confirming", () => {
    const onCancel = vi.fn();
    render(
      <ConfirmDialog
        open
        title="Archive?"
        description="desc"
        onCancel={onCancel}
        onConfirm={() => undefined}
      />
    );

    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("restores focus to trigger when confirm dialog closes", () => {
    function ConfirmHarness() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button type="button" onClick={() => setOpen(true)}>
            Open confirm
          </button>
          <ConfirmDialog
            open={open}
            title="Archive?"
            description="desc"
            onCancel={() => setOpen(false)}
            onConfirm={() => undefined}
          />
        </>
      );
    }

    render(<ConfirmHarness />);

    const trigger = screen.getByRole("button", { name: "Open confirm" });
    trigger.focus();
    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(trigger).toHaveFocus();
  });

  it("keeps confirm dialog actions visible on narrow viewport", () => {
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      writable: true,
      value: 320
    });
    window.dispatchEvent(new Event("resize"));

    render(
      <ConfirmDialog
        open
        title="Archive?"
        description="desc"
        onCancel={() => undefined}
        onConfirm={() => undefined}
      />
    );

    expect(screen.getByRole("button", { name: "Cancel" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Confirm" })).toBeVisible();
  });

  it("renders problem banner with fallback and dismiss", () => {
    const onClose = vi.fn();
    const problem: ProblemDetails = { type: "about:blank", title: "", status: 406 };
    render(<ProblemBanner problem={problem} onClose={onClose} />);
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText("Client contract error")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("renders transaction form and filters categories by type", () => {
    const onFieldChange = vi.fn();
    const onSubmit = vi.fn((event: FormEvent) => event.preventDefault());
    const state: TransactionFormState = {
      type: "expense",
      accountId: "a1",
      categoryId: "",
      amountCents: "100",
      date: "2026-02-20",
      merchant: "",
      note: ""
    };

    render(
      <TransactionForm
        open
        title="Create transaction"
        submitLabel="Create transaction"
        state={state}
        accounts={[
          { id: "a1", name: "Main", type: "cash", initial_balance_cents: 0, archived_at: null }
        ]}
        categories={[
          { id: "c1", name: "Food", type: "expense", archived_at: null },
          { id: "c2", name: "Salary", type: "income", archived_at: null }
        ]}
        problem={null}
        onFieldChange={onFieldChange}
        onClose={() => undefined}
        onSubmit={onSubmit}
      />
    );

    expect(screen.getByRole("option", { name: "Food" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Salary" })).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Type"), { target: { value: "income" } });
    expect(onFieldChange).toHaveBeenCalledWith("type", "income");
  });

  it("renders transaction row actions and triggers handlers", () => {
    const onEdit = vi.fn();
    const onArchive = vi.fn();
    const onRestore = vi.fn();
    const transaction = {
      id: "t1",
      type: "expense" as const,
      account_id: "a1",
      category_id: "c1",
      amount_cents: 100,
      date: "2026-02-18",
      archived_at: null,
      created_at: "2026-02-18T10:00:00Z",
      updated_at: "2026-02-18T10:00:00Z"
    };

    const { rerender } = render(
      <TransactionRowActions
        transaction={transaction}
        restoringId={null}
        onEdit={onEdit}
        onArchive={onArchive}
        onRestore={onRestore}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    fireEvent.click(screen.getByRole("button", { name: "Archive" }));
    expect(onEdit).toHaveBeenCalledWith(transaction);
    expect(onArchive).toHaveBeenCalledWith(transaction);

    rerender(
      <TransactionRowActions
        transaction={{ ...transaction, archived_at: "2026-02-20T00:00:00Z" }}
        restoringId="t1"
        onEdit={onEdit}
        onArchive={onArchive}
        onRestore={onRestore}
      />
    );
    expect(screen.getByRole("button", { name: "Restoring..." })).toBeDisabled();
  });
});
