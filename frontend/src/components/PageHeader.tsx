import type { ReactNode } from "react";

import { Button } from "@/ui/button";

type PageHeaderProps = {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  actionDisabled?: boolean;
  actions?: ReactNode;
  children?: ReactNode;
};

export default function PageHeader({
  title,
  description,
  actionLabel,
  onAction,
  actionDisabled = false,
  actions,
  children
}: PageHeaderProps) {
  return (
    <header className="mb-5 animate-rise-in space-y-3 border-b border-border/70 pb-4 sm:mb-6 sm:space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
        <h1 className="text-[clamp(1.55rem,3.4vw,2.1rem)] leading-tight">{title}</h1>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
        </div>
        {actions ?? (actionLabel && onAction ? (
          <Button type="button" className="w-full sm:w-auto" onClick={onAction} disabled={actionDisabled}>
            {actionLabel}
          </Button>
        ) : null)}
      </div>
      {children ? <div>{children}</div> : null}
    </header>
  );
}
