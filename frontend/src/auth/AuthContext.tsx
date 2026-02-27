import { createContext, useCallback, useMemo, useRef, useState, type ReactNode } from "react";
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
  logout: () => Promise<void>;
  bootstrapSession: () => Promise<boolean>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);
const MAX_SESSION_BOOTSTRAP_ATTEMPTS = 3;

type SessionState = {
  user: User | null;
  accessToken: string | null;
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<SessionState>({ user: null, accessToken: null });
  const [isBootstrapping, setIsBootstrapping] = useState(false);
  const tokenRef = useRef<string | null>(null);
  const skipNextBootstrapRef = useRef(false);

  const setSessionState = (next: SessionState) => {
    tokenRef.current = next.accessToken;
    setSession(next);
  };

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
    [queryClient]
  );

  const login = useCallback(async (username: string, password: string): Promise<void> => {
    const authSession = await client.login(username, password);
    setSessionState({ accessToken: authSession.access_token, user: authSession.user });
  }, [client]);

  const logout = useCallback(async (): Promise<void> => {
    skipNextBootstrapRef.current = true;
    await client.logout();
    queryClient.clear();
  }, [client, queryClient]);

  const bootstrapSession = useCallback(async (): Promise<boolean> => {
    if (skipNextBootstrapRef.current) {
      skipNextBootstrapRef.current = false;
      return false;
    }
    if (tokenRef.current && session.user) {
      return true;
    }
    setIsBootstrapping(true);
    try {
      for (let attempt = 1; attempt <= MAX_SESSION_BOOTSTRAP_ATTEMPTS; attempt += 1) {
        try {
          if (!tokenRef.current) {
            const refreshed = await client.refresh({
              silentAuthFailure: true,
              suppressAuthFailureRedirect: true
            });
            if (!refreshed?.access_token) {
              setSessionState({ accessToken: null, user: null });
              return false;
            }
          }
          const meUser = await client.me();
          setSessionState({ accessToken: tokenRef.current, user: meUser });
          return true;
        } catch {
          // Intentionally continue until max attempts are reached.
        }
      }

      setSessionState({ accessToken: null, user: null });
      return false;
    } finally {
      setIsBootstrapping(false);
    }
  }, [client, session.user]);

  const value: AuthContextValue = useMemo(
    () => ({
      apiClient: client,
      user: session.user,
      accessToken: session.accessToken,
      isAuthenticated: Boolean(session.accessToken && session.user),
      isBootstrapping,
      login,
      logout,
      bootstrapSession
    }),
    [client, session.user, session.accessToken, isBootstrapping, login, logout, bootstrapSession]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
