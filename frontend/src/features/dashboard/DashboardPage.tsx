import { type FormEvent, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";

import { listAccounts } from "@/api/accounts";
import { listCategories } from "@/api/categories";
import { createTransaction } from "@/api/transactions";
import type { AnalyticsByCategoryItem, ProblemDetails, TransactionCreate } from "@/api/types";
import { useAuth } from "@/auth/useAuth";
import ProblemDetailsInline from "@/components/errors/ProblemDetailsInline";
import PageHeader from "@/components/PageHeader";
import TransactionForm, { type TransactionFormState } from "@/components/transactions/TransactionForm";
import {
  currentUtcMonth,
  monthToDateRange,
  recentMonths,
  useDashboardCategorySummary,
  useDashboardExpenseSample,
  useDashboardMonthSummary,
  useDashboardTrend
} from "@/features/dashboard/queries";
import { detectSpendingSpikes } from "@/features/dashboard/spikes";
import { Button } from "@/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/card";
import { budgetUsagePercent, formatCents } from "@/utils/money";
import { ApiProblemError } from "@/api/errors";

const EMPTY_FORM: TransactionFormState = {
  type: "expense",
  accountId: "",
  categoryId: "",
  amountCents: "",
  date: "",
  merchant: "",
  note: ""
};

type OverBudgetItem = {
  categoryId: string;
  categoryName: string;
  spentCents: number;
  limitCents: number;
  overCents: number;
};

type TrendPoint = {
  month: string;
  expense: number;
  budget: number;
};

type MoneyDisplayParts = {
  currency: string | null;
  amount: string;
};

function toOverBudgetItems(items: AnalyticsByCategoryItem[]): OverBudgetItem[] {
  return items
    .filter((item) => (item.budget_limit_cents ?? 0) > 0 && (item.budget_spent_cents ?? 0) > (item.budget_limit_cents ?? 0))
    .map((item) => {
      const spent = item.budget_spent_cents ?? 0;
      const limit = item.budget_limit_cents ?? 0;
      return {
        categoryId: item.category_id,
        categoryName: item.category_name,
        spentCents: spent,
        limitCents: limit,
        overCents: spent - limit
      };
    })
    .sort((left, right) => right.overCents - left.overCents);
}

function toLocalProblem(problem: ProblemDetails): ApiProblemError {
  return new ApiProblemError(problem, {
    httpStatus: problem.status,
    requestId: null,
    retryAfter: null
  });
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function toTrendPoints(rows: { month: string; expense_total_cents: number; budget_limit_cents?: number }[]): TrendPoint[] {
  return rows.map((row) => ({
    month: row.month,
    expense: row.expense_total_cents,
    budget: row.budget_limit_cents ?? 0
  }));
}

function toMoneyDisplayParts(currencyCode: string, cents: number): MoneyDisplayParts {
  const parts = new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: currencyCode
  }).formatToParts(cents / 100);
  const currency = parts
    .filter((part) => part.type === "currency")
    .map((part) => part.value)
    .join("");
  const amount = parts
    .filter((part) => part.type !== "currency" && part.type !== "literal")
    .map((part) => part.value)
    .join("");
  return {
    currency: currency || null,
    amount
  };
}

export default function DashboardPage() {
  const { apiClient, user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedMonth, setSelectedMonth] = useState(currentUtcMonth);
  const [formOpen, setFormOpen] = useState(false);
  const [formProblem, setFormProblem] = useState<unknown | null>(null);
  const [formState, setFormState] = useState<TransactionFormState>(EMPTY_FORM);
  const monthOptions = useMemo(() => recentMonths(6), []);
  const range = useMemo(() => monthToDateRange(selectedMonth), [selectedMonth]);

  const monthQuery = useDashboardMonthSummary(apiClient, range);
  const categoryQuery = useDashboardCategorySummary(apiClient, range);
  const expenseSampleQuery = useDashboardExpenseSample(apiClient, range);
  const trendQuery = useDashboardTrend(apiClient, monthOptions);

  const accountsQuery = useQuery({
    queryKey: ["accounts-options"],
    meta: { skipGlobalErrorToast: true },
    queryFn: () => listAccounts(apiClient, { includeArchived: false, limit: 100 })
  });

  const categoriesQuery = useQuery({
    queryKey: ["categories-options"],
    meta: { skipGlobalErrorToast: true },
    queryFn: () => listCategories(apiClient, { includeArchived: false, type: "all", limit: 100 })
  });

  const createMutation = useMutation({
    mutationFn: (payload: TransactionCreate) => createTransaction(apiClient, payload),
    onSuccess: async () => {
      setFormOpen(false);
      setFormState(EMPTY_FORM);
      await queryClient.invalidateQueries({ queryKey: ["transactions"] });
      await queryClient.invalidateQueries({ queryKey: ["analytics"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (error) => {
      setFormProblem(error);
    }
  });

  const currencyCode = user?.currency_code ?? "USD";
  const monthRow = monthQuery.data;
  const incomeTotal = monthRow?.income_total_cents ?? 0;
  const expenseTotal = monthRow?.expense_total_cents ?? 0;
  const netTotal = incomeTotal - expenseTotal;
  const budgetSpent = monthRow?.budget_spent_cents ?? 0;
  const budgetLimit = monthRow?.budget_limit_cents ?? 0;
  const budgetPercent = budgetUsagePercent(budgetSpent, budgetLimit);

  const overBudgetItems = useMemo(() => toOverBudgetItems(categoryQuery.data ?? []), [categoryQuery.data]);
  const spikes = useMemo(() => detectSpendingSpikes(expenseSampleQuery.data ?? []), [expenseSampleQuery.data]);
  const expenseByCategory = useMemo(
    () => [...(categoryQuery.data ?? [])].sort((left, right) => right.expense_total_cents - left.expense_total_cents).slice(0, 5),
    [categoryQuery.data]
  );
  const maxExpenseCategory = expenseByCategory[0]?.expense_total_cents ?? 0;
  const trendPoints = useMemo(() => toTrendPoints(trendQuery.data ?? []), [trendQuery.data]);
  const maxTrendValue = useMemo(
    () => Math.max(1, ...trendPoints.map((point) => Math.max(point.expense, point.budget))),
    [trendPoints]
  );

  const isLoading = monthQuery.isLoading || categoryQuery.isLoading || expenseSampleQuery.isLoading || trendQuery.isLoading;
  const hasAnyData = incomeTotal > 0 || expenseTotal > 0 || (categoryQuery.data?.length ?? 0) > 0 || (expenseSampleQuery.data?.length ?? 0) > 0;
  const combinedError = monthQuery.error ?? categoryQuery.error ?? expenseSampleQuery.error ?? trendQuery.error ?? null;

  const analyticsLink = `/app/analytics?from=${encodeURIComponent(range.from)}&to=${encodeURIComponent(range.to)}`;
  const budgetsLink = `/app/budgets?month=${encodeURIComponent(selectedMonth)}`;
  const transactionsExpenseLink =
    `/app/transactions?from=${encodeURIComponent(range.from)}&to=${encodeURIComponent(range.to)}&type=expense`;
  const transactionsLink = `/app/transactions?from=${encodeURIComponent(range.from)}&to=${encodeURIComponent(range.to)}`;
  const riskCount = overBudgetItems.length + spikes.spikes.length;
  const savingsRate = incomeTotal > 0 ? Math.round((netTotal / incomeTotal) * 100) : null;
  const budgetBufferCents = budgetLimit > 0 ? budgetLimit - budgetSpent : null;
  const incomeDisplay = useMemo(() => toMoneyDisplayParts(currencyCode, incomeTotal), [currencyCode, incomeTotal]);
  const expenseDisplay = useMemo(() => toMoneyDisplayParts(currencyCode, expenseTotal), [currencyCode, expenseTotal]);
  const netDisplay = useMemo(() => toMoneyDisplayParts(currencyCode, netTotal), [currencyCode, netTotal]);
  const budgetSpentDisplay = useMemo(() => toMoneyDisplayParts(currencyCode, budgetSpent), [currencyCode, budgetSpent]);
  const budgetLimitDisplay = useMemo(() => toMoneyDisplayParts(currencyCode, budgetLimit), [currencyCode, budgetLimit]);
  const budgetBufferDisplay = useMemo(
    () => (budgetBufferCents === null ? null : toMoneyDisplayParts(currencyCode, budgetBufferCents)),
    [budgetBufferCents, currencyCode]
  );
  const healthScore = useMemo(() => {
    if (!hasAnyData) {
      return null;
    }
    let score = 100;
    if (netTotal < 0) {
      score -= 30;
    }
    if (budgetPercent !== null && budgetPercent > 100) {
      score -= 25;
    } else if (budgetPercent !== null && budgetPercent > 85) {
      score -= 10;
    }
    score -= overBudgetItems.length * 8;
    score -= spikes.spikes.length * 10;
    return clamp(score, 0, 100);
  }, [budgetPercent, hasAnyData, netTotal, overBudgetItems.length, spikes.spikes.length]);
  const healthState = !hasAnyData ? "Insufficient data" : (healthScore ?? 0) < 55 ? "Critical" : (healthScore ?? 0) < 75 ? "Warning" : "Healthy";
  const healthToneClass = !hasAnyData
    ? "border-border bg-muted text-muted-foreground"
    : healthState === "Critical"
      ? "border-destructive/35 bg-destructive/10 text-destructive"
      : healthState === "Warning"
        ? "border-amber-500/35 bg-amber-500/10 text-amber-700 dark:text-amber-200"
        : "border-emerald-500/35 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200";
  const timelineSteps = [
    {
      id: "step-01",
      title: "Capture new activity",
      detail: "Register latest movement to keep this month current.",
      href: transactionsLink,
      cta: "Add transaction"
    },
    {
      id: "step-02",
      title: "Review risk drivers",
      detail: riskCount > 0 ? `${riskCount} active alert(s) detected across budget and spikes.` : "No active alerts right now.",
      href: overBudgetItems.length > 0 ? budgetsLink : transactionsExpenseLink,
      cta: overBudgetItems.length > 0 ? "Open budgets" : "Review expenses"
    },
    {
      id: "step-03",
      title: "Close the loop",
      detail: "Validate month outcomes in analytics and adjust budgets if required.",
      href: analyticsLink,
      cta: "Open analytics"
    }
  ];

  function setField(field: keyof TransactionFormState, value: string) {
    setFormState((previous) => {
      const next = { ...previous, [field]: value };
      if (field === "type") {
        next.categoryId = "";
      }
      return next;
    });
  }

  function openQuickTransaction() {
    setFormProblem(null);
    setFormState((previous) => ({
      ...EMPTY_FORM,
      date: range.to || previous.date
    }));
    setFormOpen(true);
  }

  function buildCreatePayload(): TransactionCreate | null {
    const amount = Number(formState.amountCents);
    if (!Number.isInteger(amount) || amount <= 0) {
      setFormProblem(toLocalProblem({
        type: "about:blank",
        title: "Invalid amount",
        status: 400,
        detail: "amount_cents must be an integer greater than zero."
      }));
      return null;
    }
    if (!formState.accountId || !formState.categoryId || !formState.date) {
      setFormProblem(toLocalProblem({
        type: "about:blank",
        title: "Invalid request",
        status: 400,
        detail: "type, account, category, amount, and date are required."
      }));
      return null;
    }
    return {
      type: formState.type,
      account_id: formState.accountId,
      category_id: formState.categoryId,
      amount_cents: amount,
      date: formState.date,
      merchant: formState.merchant.trim() || undefined,
      note: formState.note.trim() || undefined
    };
  }

  async function handleSubmitQuickTransaction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormProblem(null);
    const payload = buildCreatePayload();
    if (!payload) {
      return;
    }
    try {
      await createMutation.mutateAsync(payload);
    } catch {
      // handled via mutation onError
    }
  }

  return (
    <section className="relative mx-auto w-full max-w-6xl space-y-4 overflow-hidden pb-3 sm:space-y-5">
      <div className="pointer-events-none absolute -left-24 -top-24 h-64 w-64 rounded-full bg-cyan-500/15 blur-3xl" aria-hidden="true" />
      <div className="pointer-events-none absolute -right-16 top-20 h-72 w-72 rounded-full bg-blue-500/10 blur-3xl" aria-hidden="true" />

      <PageHeader title="Dashboard" description="Current month health snapshot with actionable alerts and quick execution flows.">
        <div className="flex w-full flex-wrap items-center gap-2 text-sm text-muted-foreground sm:w-auto sm:gap-3">
          <label className="inline-flex items-center gap-2">
            <span>Month</span>
            <select
              className="min-h-10 rounded-lg border border-border/70 bg-background/90 px-3 py-2 text-sm shadow-sm outline-none ring-offset-background transition-colors focus-visible:ring-2 focus-visible:ring-primary/50"
              value={selectedMonth}
              onChange={(event) => setSelectedMonth(event.target.value)}
              aria-label="Dashboard month"
            >
              {monthOptions.map((month) => (
                <option key={month} value={month}>
                  {month}
                </option>
              ))}
            </select>
          </label>
        </div>
      </PageHeader>

      {combinedError ? (
        <ProblemDetailsInline
          error={combinedError}
          onRetry={() => {
            void monthQuery.refetch();
            void categoryQuery.refetch();
            void expenseSampleQuery.refetch();
            void trendQuery.refetch();
          }}
        />
      ) : null}

      <div className="grid gap-3 xl:grid-cols-[1.2fr_1fr]">
        <Card className="border-border/70 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle>Executive health score</CardTitle>
            <p className="text-xs text-muted-foreground">Fast signal to decide where to act first.</p>
          </CardHeader>
          <CardContent className="space-y-3 sm:space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Month score</p>
                <p className="text-4xl font-semibold tracking-tight">{isLoading ? "--" : healthScore ?? "--"}</p>
              </div>
              <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${healthToneClass}`}>{healthState}</span>
            </div>
            <div className="grid gap-2 md:grid-cols-3">
              <div className="rounded-md border bg-muted/20 p-2.5">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Savings rate</p>
                <p className="mt-1 text-lg font-semibold">{isLoading ? "--" : savingsRate === null ? "N/A" : `${savingsRate}%`}</p>
              </div>
              <div className="rounded-md border bg-muted/20 p-2.5">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Risk alerts</p>
                <p className="mt-1 text-lg font-semibold">{isLoading ? "--" : riskCount}</p>
              </div>
              <div className="rounded-md border bg-muted/20 p-2.5">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Budget buffer</p>
                <div className="mt-1 min-w-0">
                  {isLoading ? (
                    <p className="text-[clamp(0.9rem,3vw,1.05rem)] font-semibold leading-tight">--</p>
                  ) : budgetBufferDisplay === null ? (
                    <p className="text-[clamp(0.9rem,3vw,1.05rem)] font-semibold leading-tight">N/A</p>
                  ) : (
                    <p className="flex min-w-0 flex-col leading-tight">
                      <span className="block max-w-full whitespace-nowrap text-[clamp(0.72rem,2.8vw,0.98rem)] font-semibold leading-tight tabular-nums">
                        {budgetBufferDisplay.amount}
                      </span>
                      {budgetBufferDisplay.currency ? (
                        <span className="mt-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                          {budgetBufferDisplay.currency}
                        </span>
                      ) : null}
                    </p>
                  )}
                </div>
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              <Button asChild variant="outline" className="w-full">
                <Link to={transactionsLink}>Open transactions</Link>
              </Button>
              <Button asChild variant="outline" className="w-full">
                <Link to={budgetsLink}>Review budgets</Link>
              </Button>
              <Button asChild variant="outline" className="w-full">
                <Link to={analyticsLink}>Open analytics</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle>Priority timeline</CardTitle>
            <p className="text-xs text-muted-foreground">Run these in order to keep the month under control.</p>
          </CardHeader>
          <CardContent className="space-y-3">
            {timelineSteps.map((step, index) => (
              <div key={step.id} className="rounded-md border bg-muted/15 p-3">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">
                    <span className="mr-2 text-xs text-muted-foreground">{`${index + 1}.`}</span>
                    {step.title}
                  </p>
                  {step.id === "step-01" ? (
                    <Button size="sm" variant="outline" type="button" onClick={openQuickTransaction}>
                      {step.cta}
                    </Button>
                  ) : (
                    <Button asChild size="sm" variant="outline">
                      <Link to={step.href}>{step.cta}</Link>
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{step.detail}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="border-border/70 bg-gradient-to-b from-emerald-500/10 to-background shadow-sm">
          <CardHeader className="space-y-1 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Income</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="flex items-end gap-2">
              <p className="text-2xl font-semibold tracking-tight tabular-nums">{isLoading ? "Loading..." : incomeDisplay.amount}</p>
              {!isLoading && incomeDisplay.currency ? <span className="pb-1 text-xs text-muted-foreground">{incomeDisplay.currency}</span> : null}
            </div>
            <p className="text-xs text-muted-foreground">Current month inflow</p>
          </CardContent>
        </Card>
        <Card className="border-border/70 bg-gradient-to-b from-rose-500/10 to-background shadow-sm">
          <CardHeader className="space-y-1 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Expense</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="flex items-end gap-2">
              <p className="text-2xl font-semibold tracking-tight tabular-nums">{isLoading ? "Loading..." : expenseDisplay.amount}</p>
              {!isLoading && expenseDisplay.currency ? <span className="pb-1 text-xs text-muted-foreground">{expenseDisplay.currency}</span> : null}
            </div>
            <p className="text-xs text-muted-foreground">Current month outflow</p>
          </CardContent>
        </Card>
        <Card className="border-border/70 bg-gradient-to-b from-sky-500/10 to-background shadow-sm">
          <CardHeader className="space-y-1 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Net</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="flex items-end gap-2">
              <p className={`text-2xl font-semibold tracking-tight tabular-nums ${netTotal < 0 ? "text-destructive" : ""}`}>
                {isLoading ? "Loading..." : netDisplay.amount}
              </p>
              {!isLoading && netDisplay.currency ? <span className="pb-1 text-xs text-muted-foreground">{netDisplay.currency}</span> : null}
            </div>
            <p className="text-xs text-muted-foreground">Income minus expense</p>
          </CardContent>
        </Card>
        <Card className="border-border/70 bg-gradient-to-b from-indigo-500/10 to-background shadow-sm">
          <CardHeader className="space-y-1 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Budget progress</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? "Loading..." : budgetPercent === null ? "No budgets set" : (
              <div className="space-y-2">
                <div className="space-y-1">
                  <div className="flex items-end gap-2">
                    <p className="text-lg font-semibold tracking-tight tabular-nums">{budgetSpentDisplay.amount}</p>
                    {budgetSpentDisplay.currency ? <span className="pb-0.5 text-xs text-muted-foreground">{budgetSpentDisplay.currency}</span> : null}
                  </div>
                  <div className="flex items-end gap-2">
                    <p className="text-lg font-semibold tracking-tight tabular-nums">{budgetLimitDisplay.amount}</p>
                    {budgetLimitDisplay.currency ? <span className="pb-0.5 text-xs text-muted-foreground">{budgetLimitDisplay.currency}</span> : null}
                  </div>
                </div>
                <div className="h-2 rounded-full bg-muted">
                  <div className="h-2 rounded-full bg-primary transition-all duration-300 motion-reduce:transition-none" style={{ width: `${Math.min(100, budgetPercent)}%` }} />
                </div>
                <div className="text-xs text-muted-foreground">{budgetPercent}% used</div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/70 bg-card/95 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle>Spending vs budget trend</CardTitle>
          <p className="text-xs text-muted-foreground">Quick visual of expense and budget over the last 6 months.</p>
        </CardHeader>
        <CardContent className="space-y-3">
          {trendPoints.length === 0 ? (
            <p className="text-sm text-muted-foreground">No trend data yet.</p>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-6 gap-2">
                {trendPoints.map((point) => {
                  const expenseHeight = Math.max(8, Math.round((point.expense / maxTrendValue) * 96));
                  const budgetHeight = point.budget > 0 ? Math.max(8, Math.round((point.budget / maxTrendValue) * 96)) : 0;
                  return (
                    <div key={point.month} className="flex flex-col items-center gap-1">
                      <div className="flex h-28 items-end gap-1">
                        <div className="w-2 rounded bg-rose-500/80" style={{ height: `${expenseHeight}px` }} />
                        <div className="w-2 rounded bg-emerald-600/80" style={{ height: `${budgetHeight}px` }} />
                      </div>
                      <span className="text-[10px] text-muted-foreground">{point.month.slice(5)}</span>
                    </div>
                  );
                })}
              </div>
              <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded bg-rose-500/80" /> Expense</span>
                <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded bg-emerald-600/80" /> Budget</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/70 bg-card/95 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle>Expense drivers</CardTitle>
          <p className="text-xs text-muted-foreground">Where this month spending is concentrated.</p>
        </CardHeader>
        <CardContent className="space-y-3">
          {expenseByCategory.length === 0 ? (
            <p className="text-sm text-muted-foreground">No category expense data for this month.</p>
          ) : (
            <ul className="space-y-2">
              {expenseByCategory.map((item) => {
                const width = maxExpenseCategory > 0 ? Math.round((item.expense_total_cents / maxExpenseCategory) * 100) : 0;
                return (
                  <li key={item.category_id} className="space-y-1 rounded-md px-2 py-1 transition-colors duration-200 hover:bg-muted/35">
                    <div className="flex items-center justify-between text-sm">
                      <span>{item.category_name}</span>
                      <span className="text-muted-foreground">{formatCents(currencyCode, item.expense_total_cents)}</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted">
                      <div className="h-2 rounded-full bg-primary/85" style={{ width: `${Math.max(4, width)}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link to={analyticsLink}>Open analytics</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to={budgetsLink}>Review budgets</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/70 bg-card/95 shadow-sm">
        <CardHeader><CardTitle>Alerts</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? <p className="text-sm text-muted-foreground">Loading alerts...</p> : null}
          {!isLoading && !hasAnyData ? (
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>No data yet for this month.</p>
              <div className="flex flex-wrap gap-2">
                <Button asChild variant="outline" size="sm">
                  <Link to="/app/transactions">Add your first transaction</Link>
                </Button>
              </div>
            </div>
          ) : null}
          {!isLoading && hasAnyData ? (
            <>
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Over-budget categories</h3>
                {overBudgetItems.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No over-budget categories for this month.</p>
                ) : (
                  <ul className="space-y-2 text-sm">
                    {overBudgetItems.map((item) => (
                      <li key={item.categoryId} className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-2">
                        <p className="font-medium">{item.categoryName}</p>
                        <p className="text-muted-foreground">
                          {formatCents(currencyCode, item.spentCents)} / {formatCents(currencyCode, item.limitCents)} ({formatCents(currencyCode, item.overCents)} over)
                        </p>
                        <Link
                          className="inline-flex min-h-9 items-center rounded-md text-xs font-medium text-amber-700 underline-offset-4 transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/60 focus-visible:ring-offset-2 dark:text-amber-300"
                          to={budgetsLink}
                        >
                          View in budgets
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-medium">Spending spikes</h3>
                {spikes.insufficientData ? (
                  <p className="text-sm text-muted-foreground">Not enough data to detect spikes.</p>
                ) : spikes.spikes.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No spikes detected this month.</p>
                ) : (
                  <ul className="space-y-2 text-sm">
                    {spikes.spikes.map((spike) => (
                      <li key={spike.id} className="rounded-lg border border-rose-500/30 bg-rose-500/5 p-2">
                        <p className="font-medium">{spike.merchant ?? "(no merchant)"}</p>
                        <p className="text-muted-foreground">{formatCents(currencyCode, spike.amountCents)} on {spike.date}</p>
                        <Link
                          className="inline-flex min-h-9 items-center rounded-md text-xs font-medium text-rose-700 underline-offset-4 transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/60 focus-visible:ring-offset-2 dark:text-rose-300"
                          to={transactionsExpenseLink}
                        >
                          Review transactions
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          ) : null}
        </CardContent>
      </Card>

      <TransactionForm
        open={formOpen}
        title="Quick transaction"
        submitLabel="Save transaction"
        submitting={createMutation.isPending}
        state={formState}
        accounts={accountsQuery.data?.items ?? []}
        categories={categoriesQuery.data?.items ?? []}
        problem={formProblem}
        onFieldChange={setField}
        onClose={() => setFormOpen(false)}
        onSubmit={handleSubmitQuickTransaction}
        isEdit={false}
      />
    </section>
  );
}
