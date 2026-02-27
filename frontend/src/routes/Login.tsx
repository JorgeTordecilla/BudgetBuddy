import { FormEvent, useEffect, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "@/auth/useAuth";
import { API_BASE_URL, APP_ENV } from "@/config";
import SessionLoader from "@/components/session/SessionLoader";
import { Button } from "@/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/ui/card";
function resolveRedirectPath(pathname: string | undefined): string {
  if (pathname && pathname.startsWith("/app/")) {
    return pathname;
  }
  return "/app/dashboard";
}

const SHOW_API_BASE = APP_ENV === "development";

export default function Login() {
  const { isAuthenticated, isBootstrapping, login, bootstrapSession } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bootstrapAttempted, setBootstrapAttempted] = useState(false);
  const [bootstrapStarted, setBootstrapStarted] = useState(false);
  const [restoredSession, setRestoredSession] = useState(false);

  const fromPathname = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname;
  const from = resolveRedirectPath(fromPathname);

  useEffect(() => {
    if (isAuthenticated || bootstrapAttempted || isBootstrapping) {
      return;
    }
    let active = true;
    setBootstrapStarted(true);
    bootstrapSession()
      .then((restored) => {
        if (active && restored) {
          setRestoredSession(true);
        }
      })
      .finally(() => {
        if (active) {
          setBootstrapAttempted(true);
          setBootstrapStarted(false);
        }
      });

    return () => {
      active = false;
    };
  }, [isAuthenticated, isBootstrapping, bootstrapAttempted, bootstrapSession]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(username, password);
      navigate(from, { replace: true });
    } catch {
      setError("Invalid credentials. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (isAuthenticated || restoredSession) {
    return <Navigate to={from} replace />;
  }

  if (!bootstrapAttempted && (isBootstrapping || bootstrapStarted)) {
    return <SessionLoader fullScreen message="Checking existing session..." />;
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Welcome to BudgetBuddy</CardTitle>
          <CardDescription>
            Sign in to continue.
            {SHOW_API_BASE ? ` API base: ${API_BASE_URL}` : ""}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <input
              className="w-full rounded-md border px-3 py-2 text-sm"
              name="username"
              placeholder="Username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="username"
              required
            />
            <input
              className="w-full rounded-md border px-3 py-2 text-sm"
              name="password"
              type="password"
              placeholder="Password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
            />
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <Button className="w-full" type="submit" disabled={submitting}>
              {submitting ? "Signing in..." : "Sign in"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
