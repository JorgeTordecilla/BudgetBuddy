type AppEnv = "development" | "staging" | "production";

const DEFAULT_API_BASE_URL = "http://localhost:8000/api";

function normalizeAppEnv(value: string | undefined): AppEnv {
  if (value === "staging" || value === "production") {
    return value;
  }
  return "development";
}

function normalizeBaseUrl(value: string | undefined): string {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : DEFAULT_API_BASE_URL;
}

const apiBaseUrl = normalizeBaseUrl(import.meta.env.VITE_API_BASE_URL);
const appEnv = normalizeAppEnv(import.meta.env.VITE_APP_ENV);
const sentryDsn = import.meta.env.VITE_SENTRY_DSN?.trim() || null;
const release = import.meta.env.VITE_RELEASE?.trim() || "dev-local";

function parseBooleanFlag(value: string | undefined, fallback = false): boolean {
  if (value == null || value.trim() === "") {
    return fallback;
  }
  return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
}

export const ENV = {
  API_BASE_URL: apiBaseUrl,
  APP_ENV: appEnv,
  SENTRY_DSN: sentryDsn,
  RELEASE: release,
  FEATURE_IMPORT: parseBooleanFlag(import.meta.env.VITE_FEATURE_IMPORT, true),
  FEATURE_AUDIT: parseBooleanFlag(import.meta.env.VITE_FEATURE_AUDIT, false)
} as const;

export type FrontendEnv = typeof ENV;
