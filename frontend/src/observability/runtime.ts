import { ENV } from "@/config/env";

type ObservabilityMeta = {
  release: string;
  environment: string;
  dsn: string | null;
  enabled: boolean;
};

type ApiFailureMeta = {
  message: string;
  status: number;
  method?: string;
  path?: string;
  requestId?: string | null;
  problemType?: string | null;
  problemTitle?: string | null;
};

type RuntimeFailureMeta = {
  message: string;
  requestId?: string | null;
  problemType?: string | null;
  path?: string;
};

const telemetry: ObservabilityMeta = {
  release: ENV.RELEASE,
  environment: ENV.APP_ENV,
  dsn: ENV.SENTRY_DSN,
  enabled: ENV.APP_ENV !== "development" && Boolean(ENV.SENTRY_DSN)
};

declare global {
  interface Window {
    Sentry?: {
      captureException: (error: unknown, context?: Record<string, unknown>) => void;
      setTag?: (key: string, value: string) => void;
    };
  }
}

export function initializeObservability(): void {
  if (typeof window === "undefined") {
    return;
  }
  if (!telemetry.enabled || !window.Sentry) {
    return;
  }
  if (typeof window.Sentry.setTag === "function") {
    window.Sentry.setTag("release", telemetry.release);
    window.Sentry.setTag("environment", telemetry.environment);
  }
}

function captureWithSentry(error: Error, extra: Record<string, unknown>): void {
  if (typeof window === "undefined") {
    return;
  }
  if (!telemetry.enabled || !window.Sentry) {
    return;
  }
  window.Sentry.captureException(error, {
    tags: {
      release: telemetry.release,
      environment: telemetry.environment
    },
    extra
  });
}

export function captureApiFailure(meta: ApiFailureMeta): void {
  const error = new Error(meta.message || "API failure");
  const payload = {
    status: meta.status,
    method: meta.method ?? null,
    path: meta.path ?? null,
    request_id: meta.requestId ?? null,
    problem_type: meta.problemType ?? null,
    problem_title: meta.problemTitle ?? null,
    release: telemetry.release,
    environment: telemetry.environment
  };
  captureWithSentry(error, payload);
}

export function captureRuntimeFailure(meta: RuntimeFailureMeta): void {
  const error = new Error(meta.message || "Runtime failure");
  const payload = {
    request_id: meta.requestId ?? null,
    problem_type: meta.problemType ?? null,
    path: meta.path ?? null,
    release: telemetry.release,
    environment: telemetry.environment
  };
  captureWithSentry(error, payload);
}

export function getObservabilityMeta(): ObservabilityMeta {
  return { ...telemetry };
}
