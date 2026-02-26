import { useId, type FormEvent, type ReactNode } from "react";

import { Button } from "@/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/ui/card";

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
      aria-describedby={description ? descriptionId : undefined}
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 px-4 py-6 backdrop-blur-sm"
    >
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle id={titleId} className="text-xl">
            {title}
          </CardTitle>
          {description ? <CardDescription id={descriptionId}>{description}</CardDescription> : null}
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={onSubmit}>
            {children}
            <div className="flex justify-end gap-2 border-t pt-4">
              <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Saving..." : submitLabel}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
