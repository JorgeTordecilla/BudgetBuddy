import { fireEvent, render, screen } from "@testing-library/react";
import type { FormEvent } from "react";
import { describe, expect, it, vi } from "vitest";

import type { ProblemDetails } from "@/api/types";
import ConfirmDialog from "@/components/ConfirmDialog";
import ModalForm from "@/components/ModalForm";
import PageHeader from "@/components/PageHeader";
import ProblemBanner from "@/components/ProblemBanner";

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
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
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

    fireEvent.click(screen.getByRole("button", { name: "Archive" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("renders problem banner with fallback and dismiss", () => {
    const onClose = vi.fn();
    const problem: ProblemDetails = { type: "about:blank", title: "", status: 406 };
    render(<ProblemBanner problem={problem} onClose={onClose} />);
    expect(screen.getByText("Client contract error")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
