import { useEffect, useState } from "react";

import { subscribeSuccessToast, type SuccessToastPayload } from "@/components/feedback/successToastStore";
import { Card, CardContent } from "@/ui/card";

export default function SuccessToast() {
  const [toasts, setToasts] = useState<SuccessToastPayload[]>([]);

  useEffect(() => {
    return subscribeSuccessToast((payload) => {
      setToasts((previous) => [...previous, payload].slice(-3));
      window.setTimeout(() => {
        setToasts((previous) => previous.filter((entry) => entry.id !== payload.id));
      }, 3200);
    });
  }, []);

  if (toasts.length === 0) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-x-3 top-3 z-50 flex flex-col gap-2 md:inset-x-auto md:right-4 md:top-4 md:w-[min(24rem,90vw)]">
      {toasts.map((toast) => (
        <Card
          key={toast.id}
          role="status"
          aria-live="polite"
          className="pointer-events-auto border-primary/35"
        >
          <CardContent className="p-3">
            <p className="text-sm font-semibold text-foreground">Transaction created</p>
            <p className="text-xs text-muted-foreground">{toast.message}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
