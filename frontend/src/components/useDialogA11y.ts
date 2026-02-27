import { useCallback, useEffect, useRef, type KeyboardEvent } from "react";

type UseDialogA11yOptions = {
  open: boolean;
  onDismiss: () => void;
  dismissDisabled?: boolean;
};

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])"
].join(", ");

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (element) => !element.hasAttribute("disabled") && element.getAttribute("aria-hidden") !== "true"
  );
}

export function useDialogA11y({ open, onDismiss, dismissDisabled = false }: UseDialogA11yOptions) {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const previousFocusedRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    previousFocusedRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }

    const focusable = getFocusableElements(dialog);
    const firstTarget = focusable[0] ?? dialog;
    firstTarget.focus();

    return () => {
      previousFocusedRef.current?.focus();
      previousFocusedRef.current = null;
    };
  }, [open]);

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.key === "Escape") {
        event.preventDefault();
        if (!dismissDisabled) {
          onDismiss();
        }
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const dialog = dialogRef.current;
      if (!dialog) {
        return;
      }

      const focusable = getFocusableElements(dialog);
      if (focusable.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const current = document.activeElement;

      if (event.shiftKey && current === first) {
        event.preventDefault();
        last?.focus();
        return;
      }

      if (!event.shiftKey && current === last) {
        event.preventDefault();
        first?.focus();
      }
    },
    [dismissDisabled, onDismiss]
  );

  return {
    dialogRef,
    onKeyDown
  };
}
