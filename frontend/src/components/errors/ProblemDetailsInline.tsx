import { useState } from "react";

import { resolveProblemUi } from "@/api/problemMapping";
import { copyToClipboard } from "@/utils/clipboard";
import { toSupportCode } from "@/components/errors/supportCode";
import { Button } from "@/ui/button";

type ProblemDetailsInlineProps = {
  error: unknown;
  onRetry?: () => void;
  onDismiss?: () => void;
};

export default function ProblemDetailsInline({ error, onRetry, onDismiss }: ProblemDetailsInlineProps) {
  const [copied, setCopied] = useState(false);
  const ui = resolveProblemUi(error, "Request failed.");

  async function handleCopy() {
    if (!ui.requestId) {
      return;
    }
    const ok = await copyToClipboard(ui.requestId);
    setCopied(ok);
  }

  return (
    <div role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm">
      <p className="font-semibold">{ui.message}</p>
      {ui.detail ? <p className="mt-1 text-muted-foreground">{ui.detail}</p> : null}
      {ui.retryAfter ? <p className="mt-1 text-muted-foreground">Retry-After: {ui.retryAfter}s</p> : null}
      {ui.requestId ? (
        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span>Support code: {toSupportCode(ui.requestId)}</span>
          <Button type="button" variant="link" className="h-auto p-0 text-xs" onClick={handleCopy}>
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>
      ) : null}
      {onDismiss ? (
        <Button type="button" variant="link" className="mt-2 h-auto p-0 text-xs" onClick={onDismiss}>
          Dismiss
        </Button>
      ) : null}
      {onRetry ? (
        <Button type="button" variant="link" className="mt-2 h-auto p-0 text-xs" onClick={onRetry}>
          Retry
        </Button>
      ) : null}
    </div>
  );
}
