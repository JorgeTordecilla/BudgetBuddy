import type { ReactNode } from "react";

import { Button } from "@/ui/button";

type PageHeaderProps = {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  actionDisabled?: boolean;
  children?: ReactNode;
};

export default function PageHeader({
  title,
  description,
  actionLabel,
  onAction,
  actionDisabled = false,
  children
}: PageHeaderProps) {
  return (
    <header className="mb-6 flex flex-col gap-4 border-b pb-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">{title}</h1>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
        {children}
      </div>
      {actionLabel && onAction ? (
        <Button type="button" className="w-full sm:w-auto" onClick={onAction} disabled={actionDisabled}>
          {actionLabel}
        </Button>
      ) : null}
    </header>
  );
}
