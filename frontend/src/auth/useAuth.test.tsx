import { renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";

import { AuthContext } from "@/auth/AuthContext";
import { useAuth } from "@/auth/useAuth";
import type { ApiClient } from "@/api/client";

const apiClientStub = {} as ApiClient;

const value = {
  apiClient: apiClientStub,
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isBootstrapping: false,
  login: async () => undefined,
  register: async () => undefined,
  logout: async () => undefined,
  bootstrapSession: async () => false
};

describe("useAuth", () => {
  it("throws outside provider", () => {
    expect(() => renderHook(() => useAuth())).toThrowError("useAuth must be used within AuthProvider");
  });

  it("returns context value inside provider", () => {
    const wrapper = ({ children }: { children: ReactNode }) => <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.bootstrapSession).toBeTypeOf("function");
  });
});


