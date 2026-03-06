import { useEffect, useRef } from "react";

import { useDialogA11y } from "@/components/useDialogA11y";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/ui/alert-dialog";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  confirming?: boolean;
  onCancel: () => void;
  onConfirm: () => void | Promise<void>;
};

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  confirming = false,
  onCancel,
  onConfirm
}: ConfirmDialogProps) {
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

  const handleCancel = () => {
    if (closingRef.current) {
      return;
    }
    closingRef.current = true;
    onCancel();
    triggerRef.current?.focus();
    queueMicrotask(() => {
      triggerRef.current?.focus();
    });
  };

  const { dialogRef, onKeyDown } = useDialogA11y({
    open,
    onDismiss: handleCancel,
    dismissDisabled: confirming
  });

  return (
    <AlertDialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && !confirming) {
          handleCancel();
        }
      }}
    >
      <AlertDialogContent
        ref={dialogRef}
        aria-modal="true"
        onKeyDown={onKeyDown}
        onEscapeKeyDown={(event) => {
          if (confirming) {
            event.preventDefault();
          }
        }}
        className="w-auto max-w-none gap-0 overflow-hidden rounded-2xl border-border/70 bg-card p-0 sm:w-[calc(100dvw_-_1.5rem)] sm:max-w-md"
      >
        <AlertDialogHeader className="space-y-1 border-b border-border/60 bg-card/95 px-4 pb-4 pt-5 text-left sm:px-5">
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-row gap-2 bg-card/98 px-4 pb-[calc(0.75rem_+_env(safe-area-inset-bottom))] pt-3 sm:px-5 sm:pb-4">
          <AlertDialogCancel
            onClick={(event) => {
              event.preventDefault();
              handleCancel();
            }}
            disabled={confirming}
            className="mt-0 min-h-11 flex-1"
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(event) => {
              event.preventDefault();
              void onConfirm();
            }}
            disabled={confirming}
            className="min-h-11 flex-1 sm:min-w-32"
          >
            {confirming ? "Working..." : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
