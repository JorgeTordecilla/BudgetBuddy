import { useEffect, useId, useRef, type FormEvent, type ReactNode } from "react";

import { useDialogA11y } from "@/components/useDialogA11y";
import { Button } from "@/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/ui/dialog";

type ModalFormProps = {
  open: boolean;
  title: string;
  description?: string;
  submitLabel: string;
  submitting?: boolean;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  children: ReactNode;
};

export default function ModalForm({
  open,
  title,
  description,
  submitLabel,
  submitting = false,
  onClose,
  onSubmit,
  children
}: ModalFormProps) {
  const id = useId();
  const formId = `${id}-form`;
  const triggerRef = useRef<HTMLElement | null>(null);
  const closingRef = useRef(false);

  useEffect(() => {
    if (!open) {
      closingRef.current = false;
      return;
    }
    if (document.activeElement instanceof HTMLElement) {
      triggerRef.current = document.activeElement;
    }
  }, [open]);

  const handleClose = () => {
    if (closingRef.current) {
      return;
    }
    closingRef.current = true;
    onClose();
    triggerRef.current?.focus();
    queueMicrotask(() => {
      triggerRef.current?.focus();
    });
  };

  const { dialogRef, onKeyDown } = useDialogA11y({
    open,
    onDismiss: handleClose,
    dismissDisabled: submitting
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && !submitting) {
          handleClose();
        }
      }}
    >
      <DialogContent
        ref={dialogRef}
        showClose={false}
        aria-modal="true"
        onKeyDown={onKeyDown}
        onEscapeKeyDown={(event) => {
          if (submitting) {
            event.preventDefault();
          }
        }}
        onPointerDownOutside={(event) => {
          if (submitting) {
            event.preventDefault();
          }
        }}
        className="w-[calc(100vw-1.5rem)] max-w-xl gap-0 overflow-hidden border-border/70 bg-card p-0"
      >
        <div className="flex max-h-[calc(100svh-1.5rem)] min-h-0 flex-col sm:max-h-[min(90dvh,56rem)]">
          <DialogHeader className="shrink-0 space-y-1 border-b border-border/60 bg-card/95 px-4 pb-4 pt-5 text-left sm:px-5">
            <DialogTitle className="text-xl">{title}</DialogTitle>
            <DialogDescription className={description ? undefined : "sr-only"}>
              {description ?? "Dialog content"}
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain px-4 py-4 sm:px-5">
            <form id={formId} className="space-y-3 pb-2" onSubmit={onSubmit}>
              {children}
            </form>
          </div>

          <DialogFooter className="shrink-0 border-t border-border/70 bg-card/98 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 sm:px-5 sm:pb-4">
            <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={handleClose} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" form={formId} className="w-full min-w-40 sm:w-auto" disabled={submitting}>
              {submitting ? "Saving..." : submitLabel}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
