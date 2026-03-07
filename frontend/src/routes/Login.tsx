import { FormEvent, useEffect, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";

import { resolveProblemUi } from "@/api/problemMapping";
import { isPasswordPolicyValid, PASSWORD_POLICY_MESSAGE } from "@/auth/passwordPolicy";
import { useAuth } from "@/auth/useAuth";
import PasswordInput from "@/components/auth/PasswordInput";
import SessionLoader from "@/components/session/SessionLoader";
import { Button } from "@/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/ui/card";
import { Input } from "@/ui/input";

function resolveRedirectPath(pathname: string | undefined): string {
  if (pathname && pathname.startsWith("/app/")) {
    return pathname;
  }
  return "/app/dashboard";
}

export default function Login() {
  const { user, isBootstrapping, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCountdown, setRetryCountdown] = useState(0);

  const fromPathname = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname;
  const from = resolveRedirectPath(fromPathname);

  useEffect(() => {
    if (retryCountdown <= 0) {
      return;
    }
    const timeout = window.setTimeout(() => {
      setRetryCountdown((current) => Math.max(0, current - 1));
    }, 1000);
    return () => {
      window.clearTimeout(timeout);
    };
  }, [retryCountdown]);

  async function submitLogin() {
    setError(null);

    if (username.trim().length < 3) {
      setError("Username must be at least 3 characters.");
      return;
    }

    if (!isPasswordPolicyValid(password)) {
      setError(PASSWORD_POLICY_MESSAGE);
      return;
    }

    setSubmitting(true);
    try {
      await login(username, password);
      navigate(from, { replace: true });
    } catch (caught) {
      const mapped = resolveProblemUi(caught, "Unexpected error.", { authFlow: "login" });
      if (!navigator.onLine) {
        setError("__offline__");
        return;
      }
      const retryAfter = Number.parseInt(mapped.retryAfter ?? "", 10);
      if (retryAfter > 0) {
        setRetryCountdown(retryAfter);
        setError("__429__");
        return;
      }
      if (mapped.status === 503) {
        setError("__503__");
        return;
      }
      const suffix = mapped.detail ? ` ${mapped.detail}` : "";
      setError(`${mapped.message}${suffix}`.trim());
    } finally {
      setSubmitting(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submitLogin();
  }

  if (user !== null) {
    return <Navigate to={from} replace />;
  }

  if (!user && isBootstrapping) {
    return <SessionLoader fullScreen message="Checking existing session..." />;
  }

  return (
    <div className="flex min-h-[100svh] items-center justify-center p-6 md:min-h-screen">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Welcome to BudgetBuddy</CardTitle>
          <CardDescription>Sign in to continue.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <Input
              className="w-full rounded-md border px-3 py-2 text-base md:text-sm"
              name="username"
              placeholder="Username"
              value={username}
              onChange={(event) => {
                if (error) {
                  setError(null);
                }
                setUsername(event.target.value);
              }}
              autoComplete="username"
              autoFocus
              required
            />
            <PasswordInput
              className="w-full rounded-md border px-3 py-2 text-base md:text-sm"
              name="password"
              placeholder="Password"
              value={password}
              onChange={(event) => {
                if (error) {
                  setError(null);
                }
                setPassword(event.target.value);
              }}
              autoComplete="current-password"
              required
            />
            {error === "__offline__" ? <p className="text-sm text-destructive">No internet connection.</p> : null}
            {error === "__429__" && retryCountdown > 0 ? (
              <p className="text-sm text-destructive">Too many attempts. Try again in {retryCountdown}s.</p>
            ) : null}
            {error === "__503__" ? (
              <div className="space-y-2">
                <p className="text-sm text-destructive">Server unavailable.</p>
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={() => {
                    setRetryCountdown(0);
                    void submitLogin();
                  }}
                >
                  Retry
                </Button>
              </div>
            ) : null}
            {error && !["__offline__", "__429__", "__503__"].includes(error) ? (
              <p className="text-sm text-destructive">{error}</p>
            ) : null}
            <Button className="w-full" type="submit" disabled={submitting || retryCountdown > 0}>
              {submitting ? "Signing in..." : retryCountdown > 0 ? `Retry in ${retryCountdown}s` : "Sign in"}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              No account yet?{" "}
              <Link className="font-medium underline-offset-4 hover:underline" to="/register">
                Create account
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
