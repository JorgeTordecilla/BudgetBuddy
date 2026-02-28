import { FormEvent, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";

import { ApiProblemError } from "@/api/errors";
import { resolveProblemUi } from "@/api/problemMapping";
import { useAuth } from "@/auth/useAuth";
import { Button } from "@/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/ui/card";

const CURRENCIES = ["USD", "COP", "EUR", "MXN"] as const;

function resolveRedirectPath(pathname: string | undefined): string {
  if (pathname && pathname.startsWith("/app/")) {
    return pathname;
  }
  return "/app/dashboard";
}

export default function Register() {
  const { isAuthenticated, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [currencyCode, setCurrencyCode] = useState<(typeof CURRENCIES)[number]>("USD");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fromPathname = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname;
  const from = resolveRedirectPath(fromPathname);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      await register(username, password, currencyCode);
      navigate(from, { replace: true });
    } catch (caught) {
      if (caught instanceof ApiProblemError) {
        const mapped = resolveProblemUi(caught);
        const suffix = mapped.detail ? ` ${mapped.detail}` : "";
        setError(`${mapped.message}${suffix}`.trim());
      } else {
        setError("Unable to create account. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (isAuthenticated) {
    return <Navigate to={from} replace />;
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Create your BudgetBuddy account</CardTitle>
          <CardDescription>Register to start tracking your finances.</CardDescription>
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
              autoComplete="new-password"
              required
            />
            <input
              className="w-full rounded-md border px-3 py-2 text-sm"
              name="confirmPassword"
              type="password"
              placeholder="Confirm password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              autoComplete="new-password"
              required
            />
            <label className="block space-y-1 text-sm">
              <span className="text-muted-foreground">Currency</span>
              <select
                className="w-full rounded-md border px-3 py-2 text-sm"
                value={currencyCode}
                onChange={(event) => setCurrencyCode(event.target.value as (typeof CURRENCIES)[number])}
                required
              >
                {CURRENCIES.map((currency) => (
                  <option key={currency} value={currency}>
                    {currency}
                  </option>
                ))}
              </select>
            </label>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <Button className="w-full" type="submit" disabled={submitting}>
              {submitting ? "Creating account..." : "Create account"}
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
