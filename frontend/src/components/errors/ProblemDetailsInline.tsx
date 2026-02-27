import { useState } from "react";

import { resolveProblemUi } from "@/api/problemMapping";
import { copyToClipboard } from "@/utils/clipboard";

type ProblemDetailsInlineProps = {
  error: unknown;
  onRetry?: () => void;
};

export default function ProblemDetailsInline({ error, onRetry }: ProblemDetailsInlineProps) {
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
          <span>Request ID: {ui.requestId}</span>
          <button type="button" className="underline" onClick={handleCopy}>
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      ) : null}
      {onRetry ? (
        <button type="button" className="mt-2 text-xs underline" onClick={onRetry}>
          Retry
        </button>
      ) : null}
    </div>
  );
}

