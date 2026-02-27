import { useEffect, useState } from "react";

import { copyToClipboard } from "@/utils/clipboard";
import { subscribeProblemToast, type ProblemToastPayload } from "@/components/errors/problemToastStore";

type ToastState = ProblemToastPayload & { copied: boolean };

export default function ProblemDetailsToast() {
  const [toasts, setToasts] = useState<ToastState[]>([]);

  useEffect(() => {
    return subscribeProblemToast((payload) => {
      setToasts((previous) => [...previous, { ...payload, copied: false }].slice(-3));
      window.setTimeout(() => {
        setToasts((previous) => previous.filter((entry) => entry.id !== payload.id));
      }, 5000);
    });
  }, []);

  async function handleCopy(id: string, requestId: string) {
    const ok = await copyToClipboard(requestId);
    if (!ok) {
      return;
    }
    setToasts((previous) =>
      previous.map((toast) => (toast.id === id ? { ...toast, copied: true } : toast))
    );
  }

  if (toasts.length === 0) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-[min(26rem,90vw)] flex-col gap-2">
      {toasts.map((toast) => (
        <div key={toast.id} role="status" className="pointer-events-auto rounded-md border bg-background p-3 shadow-md">
          <p className="text-sm font-semibold">{toast.problem.message}</p>
          {toast.problem.detail ? <p className="mt-1 text-xs text-muted-foreground">{toast.problem.detail}</p> : null}
          {toast.problem.retryAfter ? (
            <p className="mt-1 text-xs text-muted-foreground">Retry-After: {toast.problem.retryAfter}s</p>
          ) : null}
          {toast.problem.requestId ? (
            <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
              <span className="truncate">Request ID: {toast.problem.requestId}</span>
              <button
                type="button"
                className="underline"
                onClick={() => handleCopy(toast.id, toast.problem.requestId as string)}
              >
                {toast.copied ? "Copied" : "Copy"}
              </button>
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}

