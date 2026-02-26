import { createContext, useCallback, useMemo, useRef, useState, type ReactNode } from "react";

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

type SessionState = {
  user: User | null;
  accessToken: string | null;
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<SessionState>({ user: null, accessToken: null });
  const [isBootstrapping, setIsBootstrapping] = useState(false);
  const tokenRef = useRef<string | null>(null);

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
        }
      }),
    []
  );

  const login = useCallback(async (username: string, password: string): Promise<void> => {
    const authSession = await client.login(username, password);
    setSessionState({ accessToken: authSession.access_token, user: authSession.user });
  }, [client]);

  const logout = useCallback(async (): Promise<void> => {
    await client.logout();
  }, [client]);

  const bootstrapSession = useCallback(async (): Promise<boolean> => {
    if (tokenRef.current) {
      return true;
    }
    setIsBootstrapping(true);
    try {
      const refreshed = await client.refresh();
      return Boolean(refreshed?.access_token);
    } finally {
      setIsBootstrapping(false);
    }
  }, [client]);

  const value: AuthContextValue = useMemo(
    () => ({
      apiClient: client,
      user: session.user,
      accessToken: session.accessToken,
      isAuthenticated: Boolean(session.accessToken),
      isBootstrapping,
      login,
      logout,
      bootstrapSession
    }),
    [client, session.user, session.accessToken, isBootstrapping, login, logout, bootstrapSession]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
