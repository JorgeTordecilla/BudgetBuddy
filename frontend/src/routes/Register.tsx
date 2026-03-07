import { FormEvent, useEffect, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";

import { resolveProblemUi } from "@/api/problemMapping";
import { isPasswordPolicyValid, PASSWORD_POLICY_MESSAGE } from "@/auth/passwordPolicy";
import { useAuth } from "@/auth/useAuth";
import PasswordInput from "@/components/auth/PasswordInput";
import { Button } from "@/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/ui/card";
import { Input } from "@/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/select";

const CURRENCIES = ["USD", "COP", "EUR", "MXN"] as const;

function resolveRedirectPath(pathname: string | undefined): string {
  if (pathname && pathname.startsWith("/app/")) {
    return pathname;
  }
  return "/app/dashboard";
}

export default function Register() {
  const { user, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [currencyCode, setCurrencyCode] = useState<(typeof CURRENCIES)[number]>("USD");
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

  async function submitRegister() {
    setError(null);

    if (username.trim().length < 3) {
      setError("Username must be at least 3 characters.");
      return;
    }

    if (!isPasswordPolicyValid(password)) {
      setError(PASSWORD_POLICY_MESSAGE);
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      await register(username, password, currencyCode);
      navigate(from, { replace: true });
    } catch (caught) {
      const mapped = resolveProblemUi(caught, "Unexpected error.", { authFlow: "register" });
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
    void submitRegister();
  }

  if (user !== null) {
    return <Navigate to={from} replace />;
  }

  return (
    <div className="flex min-h-[100svh] items-center justify-center p-6 md:min-h-screen">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Create your BudgetBuddy account</CardTitle>
          <CardDescription>Register to start tracking your finances.</CardDescription>
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
              autoComplete="new-password"
              required
            />
            <PasswordInput
              className="w-full rounded-md border px-3 py-2 text-base md:text-sm"
              name="confirmPassword"
              placeholder="Confirm password"
              value={confirmPassword}
              onChange={(event) => {
                if (error) {
                  setError(null);
                }
                setConfirmPassword(event.target.value);
              }}
              autoComplete="new-password"
              required
            />
            <label className="block space-y-1 text-sm">
              <span className="text-muted-foreground">Currency</span>
              <Select
                value={currencyCode}
                onValueChange={(value) => {
                  if (error) {
                    setError(null);
                  }
                  setCurrencyCode(value as (typeof CURRENCIES)[number]);
                }}
              >
                <SelectTrigger className="w-full rounded-md border px-3 py-2 text-base md:text-sm">
                  <SelectValue placeholder="Currency" />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((currency) => (
                    <SelectItem key={currency} value={currency}>
                      {currency}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
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
                    void submitRegister();
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
              {submitting
                ? "Creating account..."
                : retryCountdown > 0
                  ? `Retry in ${retryCountdown}s`
                  : "Create account"}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link className="font-medium underline-offset-4 hover:underline" to="/login">
                Sign in
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
