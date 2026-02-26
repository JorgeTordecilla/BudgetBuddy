import { useId } from "react";

import { Button } from "@/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/ui/card";

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

  if (!open) {
    return null;
  }

  const titleId = `${id}-title`;
  const descriptionId = `${id}-description`;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          if (!confirming) {
            onCancel();
          }
        }
      }}
      tabIndex={-1}
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 px-4 py-6 backdrop-blur-sm"
    >
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle id={titleId} className="text-lg">
            {title}
          </CardTitle>
          <CardDescription id={descriptionId}>{description}</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel} disabled={confirming}>
            Cancel
          </Button>
          <Button type="button" onClick={() => void onConfirm()} disabled={confirming}>
            {confirming ? "Working..." : confirmLabel}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
