import { useId } from "react";

import { Button } from "@/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/ui/card";
import { useDialogA11y } from "@/components/useDialogA11y";

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
  const id = useId();
  const { dialogRef, onKeyDown } = useDialogA11y({
    open,
    onDismiss: onCancel,
    dismissDisabled: confirming
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
      aria-describedby={descriptionId}
      onKeyDown={onKeyDown}
      tabIndex={-1}
      className="fixed inset-0 z-50 bg-foreground/30 backdrop-blur-sm"
    >
      <div className="flex min-h-full items-start justify-center px-3 py-3 sm:items-center sm:px-4 sm:py-6">
      <Card className="w-full max-w-md overflow-hidden">
        <CardHeader className="border-b border-border/60 bg-card/95">
          <CardTitle id={titleId} className="text-lg">
            {title}
          </CardTitle>
          <CardDescription id={descriptionId}>{description}</CardDescription>
        </CardHeader>
        <CardContent className="bg-card/98 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 sm:pb-4">
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={onCancel} disabled={confirming}>
              Cancel
            </Button>
            <Button type="button" className="w-full min-w-32 sm:w-auto" onClick={() => void onConfirm()} disabled={confirming}>
              {confirming ? "Working..." : confirmLabel}
            </Button>
          </div>
        </CardContent>
      </Card>
      </div>
    </div>
  );
}
