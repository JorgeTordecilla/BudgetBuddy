import { ENV } from "@/config/env";
import type { AuthSessionResponse, ProblemDetails, RegisterRequest, User } from "@/api/types";
import { parseProblemDetails, toApiError } from "@/api/errors";
import { resolveProblemUi } from "@/api/problemMapping";
import { publishProblemToast } from "@/components/errors/problemToastStore";
import { setLastRequestId } from "@/state/diagnostics";
import { captureApiFailure } from "@/observability/runtime";

export const VENDOR_MEDIA_TYPE = "application/vnd.budgetbuddy.v1+json";
const REFRESH_REUSE_DETECTED_TYPE = "https://api.budgetbuddy.dev/problems/refresh-reuse-detected";

type AuthBindings = {
  getAccessToken: () => string | null;
  setSession: (next: { accessToken: string; user: User }) => void;
  clearSession: () => void;
};

type ClientOptions = {
  fetchImpl?: typeof fetch;
  baseUrl?: string;
  onAuthFailure?: () => void;
};

type RequestOptions = {
  auth?: boolean;
  retryOn401?: boolean;
};

type RefreshOptions = {
  silentAuthFailure?: boolean;
  suppressAuthFailureRedirect?: boolean;
};

function requestId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function needsVendorContentType(method: string | undefined): boolean {
  const normalized = (method ?? "GET").toUpperCase();
  return normalized === "POST" || normalized === "PATCH" || normalized === "PUT";
}

function redirectToLogin(): void {
  if (typeof window !== "undefined" && window.location.pathname !== "/login") {
    window.history.replaceState({}, "", "/login");
  }
}

function logFailureDev(requestIdValue: string, response: Response): void {
  if (import.meta.env.DEV) {
    // Operational signal for debugging correlation with backend logs.
    console.error("api_request_failed", {
      requestId: requestIdValue,
      status: response.status,
      statusText: response.statusText
    });
  }
}

export async function readProblemDetails(response: Response): Promise<ProblemDetails | null> {
  return parseProblemDetails(response);
}

export function createApiClient(bindings: AuthBindings, options: ClientOptions = {}) {
  const fetchImpl = options.fetchImpl ?? fetch;
  const baseUrl = options.baseUrl ?? ENV.API_BASE_URL;
  const onAuthFailure = options.onAuthFailure ?? redirectToLogin;
  let refreshInFlight: Promise<AuthSessionResponse | null> | null = null;

  const publishAuthProblem = async (input: Response | unknown, fallbackMessage: string): Promise<void> => {
    const normalized = await toApiError(input, fallbackMessage);
    publishProblemToast(resolveProblemUi(normalized));
  };

  const refresh = async (options: RefreshOptions = {}): Promise<AuthSessionResponse | null> => {
    const { silentAuthFailure = false, suppressAuthFailureRedirect = false } = options;
    if (refreshInFlight) {
      return refreshInFlight;
    }
    refreshInFlight = (async () => {
      try {
        let response = await rawRequest("/auth/refresh", {
          method: "POST"
        });
        if (response.status === 403) {
          const problem = await parseProblemDetails(response);
          if (problem?.type === REFRESH_REUSE_DETECTED_TYPE) {
            // A concurrent refresh may have already rotated the cookie. Retry once with the updated cookie jar.
            response = await rawRequest("/auth/refresh", {
              method: "POST"
            });
          }
        }
        if (!response.ok) {
          if (!silentAuthFailure) {
            await publishAuthProblem(response, "Refresh failed");
          }
          if (response.status === 401 || response.status === 403) {
            bindings.clearSession();
            if (!suppressAuthFailureRedirect) {
              onAuthFailure();
            }
          }
          return null;
        }
        const session = (await response.json()) as AuthSessionResponse;
        bindings.setSession({ accessToken: session.access_token, user: session.user });
        return session;
      } catch (error) {
        if (!silentAuthFailure) {
          await publishAuthProblem(error, "Refresh failed");
        }
        throw error;
      }
    })().finally(() => {
      refreshInFlight = null;
    });
    return refreshInFlight;
  };

  const rawRequest = async (path: string, init: RequestInit = {}, requestOptions: RequestOptions = {}): Promise<Response> => {
    const { auth = false, retryOn401 = false } = requestOptions;
    const headers = new Headers(init.headers);
    const reqId = requestId();
    if (!headers.has("Accept")) {
      headers.set("Accept", VENDOR_MEDIA_TYPE);
    }
    headers.set("X-Request-Id", reqId);
    if (needsVendorContentType(init.method) && !headers.has("Content-Type")) {
      headers.set("Content-Type", VENDOR_MEDIA_TYPE);
    }
    if (auth) {
      const token = bindings.getAccessToken();
      if (token) {
        headers.set("Authorization", `Bearer ${token}`);
      }
    }

    let response: Response;
    try {
      response = await fetchImpl(`${baseUrl}${path}`, {
        ...init,
        headers,
        credentials: "include"
      });
    } catch (error) {
      captureApiFailure({
        message: error instanceof Error ? error.message : "Network request failed",
        status: 0,
        method: (init.method ?? "GET").toUpperCase(),
        path
      });
      throw error;
    }
    setLastRequestId(response.headers.get("X-Request-Id"));

    if (response.status === 401 && retryOn401) {
      const refreshed = await refresh();
      if (refreshed) {
        const retried = await rawRequest(path, init, { ...requestOptions, retryOn401: false });
        if (retried.status === 401) {
          bindings.clearSession();
          onAuthFailure();
        }
        return retried;
      }
      return response;
    }

    if (!response.ok) {
      const problem = await readProblemDetails(response);
      captureApiFailure({
        message: problem?.title ?? response.statusText ?? "Request failed",
        status: response.status,
        method: (init.method ?? "GET").toUpperCase(),
        path,
        requestId: response.headers.get("X-Request-Id"),
        problemType: problem?.type ?? null,
        problemTitle: problem?.title ?? null
      });
      logFailureDev(reqId, response);
    }
    return response;
  };

  return {
    request: (path: string, init: RequestInit = {}) => rawRequest(path, init, { auth: true, retryOn401: true }),
    requestPublic: (path: string, init: RequestInit = {}) => rawRequest(path, init),
    login: async (username: string, password: string): Promise<AuthSessionResponse> => {
      const response = await rawRequest("/auth/login", {
        method: "POST",
        body: JSON.stringify({ username, password })
      });
      if (!response.ok) {
        throw new Error("login_failed");
      }
      return (await response.json()) as AuthSessionResponse;
    },
    register: async (payload: RegisterRequest): Promise<AuthSessionResponse> => {
      const response = await rawRequest("/auth/register", {
        method: "POST",
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        throw await toApiError(response, "register_failed");
      }
      return (await response.json()) as AuthSessionResponse;
    },
    refresh,
    me: async (): Promise<User> => {
      const response = await rawRequest("/me", { method: "GET" }, { auth: true, retryOn401: true });
      if (!response.ok) {
        throw new Error("me_failed");
      }
      return (await response.json()) as User;
    },
    logout: async (): Promise<void> => {
      try {
        const response = await rawRequest("/auth/logout", { method: "POST" });
        if (!response.ok) {
          await publishAuthProblem(response, "Logout failed");
        }
      } catch (error) {
        await publishAuthProblem(error, "Logout failed");
        throw error;
      } finally {
        bindings.clearSession();
      }
    }
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
