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

export const ENV = {
  API_BASE_URL: apiBaseUrl,
  APP_ENV: appEnv,
  SENTRY_DSN: sentryDsn
} as const;

export type FrontendEnv = typeof ENV;
