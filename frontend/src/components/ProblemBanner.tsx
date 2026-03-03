import { useState } from "react";

import { ApiProblemError } from "@/api/errors";
import type { ProblemDetails } from "@/api/types";
import { resolveProblemUi } from "@/api/problemMapping";
import { copyToClipboard } from "@/utils/clipboard";
import { toSupportCode } from "@/components/errors/supportCode";
import { Button } from "@/ui/button";

type ProblemBannerProps = {
  problem: unknown | null;
  onClose?: () => void;
};

export default function ProblemBanner({ problem, onClose }: ProblemBannerProps) {
  const [copied, setCopied] = useState(false);
  if (!problem) {
    return null;
  }

  const normalizedError =
    isProblemDetails(problem)
      ? new ApiProblemError(problem, { httpStatus: problem.status, requestId: null, retryAfter: null })
      : problem;
  const ui = resolveProblemUi(normalizedError, "Request failed.");

  async function handleCopy() {
    if (!ui.requestId) {
      return;
    }
    const ok = await copyToClipboard(ui.requestId);
    setCopied(ok);
  }

  return (
    <div role="alert" aria-live="assertive" className="mb-4 rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="font-semibold">{ui.message}</p>
          {ui.detail ? <p className="text-muted-foreground">{ui.detail}</p> : null}
          {ui.requestId ? (
            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span>Support code: {toSupportCode(ui.requestId)}</span>
              <Button type="button" variant="link" className="h-auto p-0 text-xs" onClick={handleCopy}>
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>
          ) : null}
        </div>
        {onClose ? (
          <Button type="button" variant="link" className="h-auto p-0 text-xs text-muted-foreground" onClick={onClose}>
            Dismiss
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function isProblemDetails(value: unknown): value is ProblemDetails {
  return Boolean(
    value
      && typeof value === "object"
      && "type" in value
      && "title" in value
      && "status" in value
  );
}
