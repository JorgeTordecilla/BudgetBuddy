import type { ProblemDetails } from "@/api/types";

const STATUS_MESSAGE: Record<number, string> = {
  403: "Forbidden",
  406: "Client contract error"
};

type ProblemBannerProps = {
  problem: ProblemDetails | null;
  onClose?: () => void;
};

export default function ProblemBanner({ problem, onClose }: ProblemBannerProps) {
  if (!problem) {
    return null;
  }

  const fallbackTitle = STATUS_MESSAGE[problem.status] ?? "Request failed";
  const title = problem.title || fallbackTitle;

  return (
    <div className="mb-4 rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="font-semibold">{title}</p>
          {problem.detail ? <p className="text-muted-foreground">{problem.detail}</p> : null}
        </div>
        {onClose ? (
          <button type="button" className="text-xs text-muted-foreground underline" onClick={onClose}>
            Dismiss
          </button>
        ) : null}
      </div>
    </div>
  );
}
