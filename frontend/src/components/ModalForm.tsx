import { useId, type FormEvent, type ReactNode } from "react";

import { Button } from "@/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/ui/card";
import { useDialogA11y } from "@/components/useDialogA11y";

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
  const { dialogRef, onKeyDown } = useDialogA11y({
    open,
    onDismiss: onClose,
    dismissDisabled: submitting
  });

  if (!open) {
    return null;
  }

  const titleId = `${id}-title`;
  const descriptionId = `${id}-description`;

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onKeyDown={onKeyDown}
      tabIndex={-1}
      className="fixed inset-0 z-50 bg-foreground/30 backdrop-blur-sm"
    >
      <div className="flex min-h-full items-start justify-center px-3 py-3 sm:items-center sm:px-4 sm:py-6">
      <Card className="w-full max-w-xl overflow-hidden">
        <div className="flex max-h-[calc(100dvh-1.5rem)] min-h-0 flex-col sm:max-h-[min(90dvh,56rem)]">
          <CardHeader className="shrink-0 border-b border-border/60 bg-card/95">
            <CardTitle id={titleId} className="text-xl">
              {title}
            </CardTitle>
            {description ? <CardDescription id={descriptionId}>{description}</CardDescription> : null}
          </CardHeader>

          <CardContent className="min-h-0 flex-1 overflow-y-auto">
            <form id={formId} className="space-y-3 pb-2" onSubmit={onSubmit}>
              {children}
            </form>
          </CardContent>

          <div className="shrink-0 border-t border-border/70 bg-card/98 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 sm:px-5 sm:pb-4">
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={onClose} disabled={submitting}>
                Cancel
              </Button>
              <Button type="submit" form={formId} className="w-full min-w-40 sm:w-auto" disabled={submitting}>
                {submitting ? "Saving..." : submitLabel}
              </Button>
            </div>
          </div>
        </div>
      </Card>
      </div>
    </div>
  );
}
