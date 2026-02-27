import { beforeEach, describe, expect, it, vi } from "vitest";

import { captureApiFailure, captureRuntimeFailure, getObservabilityMeta, initializeObservability } from "@/observability/runtime";

describe("observability runtime", () => {
  it("exposes release and environment metadata", () => {
    const meta = getObservabilityMeta();
    expect(meta.release).toBeTypeOf("string");
    expect(["development", "staging", "production"]).toContain(meta.environment);
  });

  it("does not throw when telemetry backend is unavailable", () => {
    expect(() => initializeObservability()).not.toThrow();
    expect(() =>
      captureApiFailure({
        message: "Forbidden",
        status: 403,
        method: "GET",
        path: "/accounts",
        requestId: "req-1",
        problemType: "https://api.budgetbuddy.dev/problems/forbidden",
        problemTitle: "Forbidden"
      })
    ).not.toThrow();
    expect(() =>
      captureRuntimeFailure({
        message: "runtime",
        path: "/app/dashboard",
        requestId: "req-2",
        problemType: "about:blank"
      })
    ).not.toThrow();
  });
});

describe("observability runtime with sentry bridge enabled", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("forwards allowlisted metadata to sentry", async () => {
    vi.doMock("@/config/env", () => ({
      ENV: {
        API_BASE_URL: "http://localhost:8000/api",
        APP_ENV: "production",
        SENTRY_DSN: "https://dsn.example",
        RELEASE: "sha-123",
        FEATURE_IMPORT: true,
        FEATURE_AUDIT: false
      }
    }));

    const captureException = vi.fn();
    const setTag = vi.fn();
    Object.assign(window, { Sentry: { captureException, setTag } });

    const runtime = await import("@/observability/runtime");
    runtime.initializeObservability();
    runtime.captureApiFailure({
      message: "Forbidden",
      status: 403,
      method: "GET",
      path: "/accounts",
      requestId: "req-10",
      problemType: "https://api.budgetbuddy.dev/problems/forbidden",
      problemTitle: "Forbidden"
    });
    runtime.captureRuntimeFailure({
      message: "runtime-fail",
      path: "/app/dashboard",
      requestId: "req-11",
      problemType: "about:blank"
    });

    expect(setTag).toHaveBeenCalledWith("release", "sha-123");
    expect(setTag).toHaveBeenCalledWith("environment", "production");
    expect(captureException).toHaveBeenCalledTimes(2);
    expect(captureException.mock.calls[0]?.[1]).toMatchObject({
      tags: { release: "sha-123", environment: "production" }
    });
  });
});
