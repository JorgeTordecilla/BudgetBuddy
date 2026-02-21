import { API_BASE_URL } from "@/config";
import type { AuthSessionResponse, User } from "@/api/types";

const VENDOR_MEDIA_TYPE = "application/vnd.budgetbuddy.v1+json";

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

export function createApiClient(bindings: AuthBindings, options: ClientOptions = {}) {
  const fetchImpl = options.fetchImpl ?? fetch;
  const baseUrl = options.baseUrl ?? API_BASE_URL;
  const onAuthFailure = options.onAuthFailure ?? redirectToLogin;
  let refreshInFlight: Promise<AuthSessionResponse | null> | null = null;

  const refresh = async (): Promise<AuthSessionResponse | null> => {
    if (refreshInFlight) {
      return refreshInFlight;
    }
    refreshInFlight = (async () => {
      const response = await rawRequest("/auth/refresh", {
        method: "POST"
      });
      if (!response.ok) {
        bindings.clearSession();
        onAuthFailure();
        return null;
      }
      const session = (await response.json()) as AuthSessionResponse;
      bindings.setSession({ accessToken: session.access_token, user: session.user });
      return session;
    })().finally(() => {
      refreshInFlight = null;
    });
    return refreshInFlight;
  };

  const rawRequest = async (path: string, init: RequestInit = {}, requestOptions: RequestOptions = {}): Promise<Response> => {
    const { auth = false, retryOn401 = false } = requestOptions;
    const headers = new Headers(init.headers);
    const reqId = requestId();
    headers.set("Accept", VENDOR_MEDIA_TYPE);
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

    const response = await fetchImpl(`${baseUrl}${path}`, {
      ...init,
      headers,
      credentials: "include"
    });

    if (response.status === 401 && retryOn401) {
      const refreshed = await refresh();
      if (refreshed) {
        return rawRequest(path, init, { ...requestOptions, retryOn401: false });
      }
      return response;
    }

    if (!response.ok) {
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
    refresh,
    me: async (): Promise<User> => {
      const response = await rawRequest("/me", { method: "GET" }, { auth: true, retryOn401: true });
      if (!response.ok) {
        throw new Error("me_failed");
      }
      return (await response.json()) as User;
    },
    logout: async (): Promise<void> => {
      await rawRequest("/auth/logout", { method: "POST" });
      bindings.clearSession();
    }
  };
}
