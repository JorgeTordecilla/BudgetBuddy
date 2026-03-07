import { createContext, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { createApiClient } from "@/api/client";
import type { ApiClient } from "@/api/client";
import type { User } from "@/api/types";

type AuthContextValue = {
  apiClient: ApiClient;
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isBootstrapping: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string, currencyCode: string) => Promise<void>;
  logout: () => Promise<void>;
  bootstrapSession: () => Promise<boolean>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);
const BOOTSTRAP_RETRY_COOLDOWN_MS = 10000;
const SESSION_STORAGE_KEY = "bb_session_user";

type SessionState = {
  user: User | null;
  accessToken: string | null;
};

function readCachedUser(): User | null {
  try {
    if (typeof window === "undefined") {
      return null;
    }
    const raw =
      window.localStorage.getItem(SESSION_STORAGE_KEY)
      ?? window.sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed === "object"
      && parsed !== null
      && typeof (parsed as { id?: unknown }).id === "string"
      && typeof (parsed as { username?: unknown }).username === "string"
    ) {
      return parsed as User;
    }
    return null;
  } catch {
    return null;
  }
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const payloadSegment = token.split(".")[1];
    if (!payloadSegment) {
      return null;
    }
    const padding = "=".repeat((4 - (payloadSegment.length % 4)) % 4);
    const base64 = `${payloadSegment}${padding}`.replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(base64)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function getJwtExp(token: string): number | null {
  const payload = decodeJwtPayload(token);
  if (!payload || typeof payload.exp !== "number") {
    return null;
  }
  return payload.exp;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<SessionState>(() => ({
    user: readCachedUser(),
    accessToken: null
  }));
  const [isBootstrapping, setIsBootstrapping] = useState(false);
  const tokenRef = useRef<string | null>(null);
  const skipNextBootstrapRef = useRef(false);
  const bootstrapInFlightRef = useRef<Promise<boolean> | null>(null);
  const lastBootstrapFailureAtRef = useRef<number | null>(null);
  const silentRefreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const providerBootstrapTriggeredRef = useRef(false);
  const clientRef = useRef<ApiClient | null>(null);

  const scheduleSilentRefresh = useCallback((token: string) => {
    if (silentRefreshTimerRef.current) {
      clearTimeout(silentRefreshTimerRef.current);
      silentRefreshTimerRef.current = null;
    }
    const exp = getJwtExp(token);
    if (!exp) {
      return;
    }
    const delayMs = Math.max(0, (exp - Date.now() / 1000 - 60) * 1000);
    silentRefreshTimerRef.current = setTimeout(() => {
      const activeClient = clientRef.current;
      if (!activeClient) {
        return;
      }
      void activeClient.refresh({
        silentAuthFailure: true,
        suppressAuthFailureRedirect: true
      }).catch(() => undefined);
    }, delayMs);
  }, []);

  const setSessionState = useCallback((next: SessionState) => {
    tokenRef.current = next.accessToken;
    if (next.accessToken) {
      scheduleSilentRefresh(next.accessToken);
    } else if (silentRefreshTimerRef.current) {
      clearTimeout(silentRefreshTimerRef.current);
      silentRefreshTimerRef.current = null;
    }
    try {
      if (typeof window !== "undefined") {
        if (next.user) {
          window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(next.user));
          window.sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(next.user));
        } else {
          window.localStorage.removeItem(SESSION_STORAGE_KEY);
          window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
        }
      }
    } catch {
      // Ignore storage failures (for example private mode restrictions).
    }
    setSession(next);
  }, [scheduleSilentRefresh]);

  const client = useMemo(
    () =>
      createApiClient({
        getAccessToken: () => tokenRef.current,
        setSession: ({ accessToken, user }) => {
          setSessionState({ accessToken, user });
        },
        clearSession: () => {
          setSessionState({ accessToken: null, user: null });
          queryClient.clear();
        }
      }),
    [queryClient, setSessionState]
  );

  useEffect(() => {
    clientRef.current = client;
  }, [client]);

  const login = useCallback(async (username: string, password: string): Promise<void> => {
    const authSession = await client.login(username, password);
    setSessionState({ accessToken: authSession.access_token, user: authSession.user });
    lastBootstrapFailureAtRef.current = null;
  }, [client]);

  const register = useCallback(async (username: string, password: string, currencyCode: string): Promise<void> => {
    const authSession = await client.register({
      username,
      password,
      currency_code: currencyCode
    });
    setSessionState({ accessToken: authSession.access_token, user: authSession.user });
    lastBootstrapFailureAtRef.current = null;
  }, [client]);

  const logout = useCallback(async (): Promise<void> => {
    skipNextBootstrapRef.current = true;
    try {
      await client.logout();
    } finally {
      setSessionState({ accessToken: null, user: null });
      queryClient.clear();
    }
  }, [client, queryClient]);

  const bootstrapSession = useCallback(async (): Promise<boolean> => {
    if (skipNextBootstrapRef.current) {
      skipNextBootstrapRef.current = false;
      return false;
    }
    if (tokenRef.current && session.user) {
      lastBootstrapFailureAtRef.current = null;
      return true;
    }
    const lastFailureAt = lastBootstrapFailureAtRef.current;
    if (lastFailureAt && Date.now() - lastFailureAt < BOOTSTRAP_RETRY_COOLDOWN_MS) {
      return false;
    }
    if (bootstrapInFlightRef.current) {
      return bootstrapInFlightRef.current;
    }

    const bootstrapPromise = (async (): Promise<boolean> => {
      setIsBootstrapping(true);
      try {
        try {
          if (!tokenRef.current) {
            const refreshed = await client.refresh({
              silentAuthFailure: true,
              suppressAuthFailureRedirect: true
            });
            if (!refreshed?.access_token) {
              setSessionState({ accessToken: null, user: null });
              lastBootstrapFailureAtRef.current = Date.now();
              return false;
            }
          }
          const meUser = await client.me();
          setSessionState({ accessToken: tokenRef.current, user: meUser });
          lastBootstrapFailureAtRef.current = null;
          return true;
        } catch {
          lastBootstrapFailureAtRef.current = Date.now();
          return false;
        }
      } finally {
        setIsBootstrapping(false);
        bootstrapInFlightRef.current = null;
      }
    })();

    bootstrapInFlightRef.current = bootstrapPromise;
    return bootstrapPromise;
  }, [client, session.user, setSessionState]);

  useEffect(() => {
    if (providerBootstrapTriggeredRef.current) {
      return;
    }
    providerBootstrapTriggeredRef.current = true;
    void bootstrapSession();
  }, [bootstrapSession]);

  useEffect(() => {
    return () => {
      if (silentRefreshTimerRef.current) {
        clearTimeout(silentRefreshTimerRef.current);
        silentRefreshTimerRef.current = null;
      }
    };
  }, []);

  const value: AuthContextValue = useMemo(
    () => ({
      apiClient: client,
      user: session.user,
      accessToken: session.accessToken,
      isAuthenticated: Boolean(session.accessToken && session.user),
      isBootstrapping,
      login,
      register,
      logout,
      bootstrapSession
    }),
    [client, session.user, session.accessToken, isBootstrapping, login, register, logout, bootstrapSession]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
