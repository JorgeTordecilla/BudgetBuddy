import { useMemo, useState } from "react";

import { ApiProblemError } from "@/api/errors";
import type { AnalyticsByCategoryItem, AnalyticsByMonthItem } from "@/api/types";
import { useAuth } from "@/auth/useAuth";
import ProblemDetailsInline from "@/components/errors/ProblemDetailsInline";
import PageHeader from "@/components/PageHeader";
import { useAnalyticsByCategory, useAnalyticsByMonth } from "@/features/analytics/analyticsQueries";
import CategoryBreakdown from "@/features/analytics/components/CategoryBreakdown";
import MonthTrendChart from "@/features/analytics/components/MonthTrendChart";
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/card";
import { defaultAnalyticsRange, isValidDateRange } from "@/utils/dates";
import { formatCents } from "@/utils/money";

type MetricType = "expense" | "income";

function summarize(monthItems: AnalyticsByMonthItem[], categoryItems: AnalyticsByCategoryItem[]) {
  const incomeTotal = monthItems.reduce((sum, row) => sum + row.income_total_cents, 0);
  const expenseTotal = monthItems.reduce((sum, row) => sum + row.expense_total_cents, 0);
  const budgetSpent = categoryItems.reduce((sum, row) => sum + (row.budget_spent_cents ?? 0), 0);
  const budgetLimit = categoryItems.reduce((sum, row) => sum + (row.budget_limit_cents ?? 0), 0);
  return { incomeTotal, expenseTotal, budgetSpent, budgetLimit };
}

export default function AnalyticsPage() {
  const { apiClient, user } = useAuth();
  const [showBudgetOverlay, setShowBudgetOverlay] = useState(true);
  const [metric, setMetric] = useState<MetricType>("expense");
  const [draftRange, setDraftRange] = useState(defaultAnalyticsRange);
  const [appliedRange, setAppliedRange] = useState(defaultAnalyticsRange);
  const [rangeError, setRangeError] = useState<string | null>(null);

  const rangeValid = isValidDateRange(appliedRange.from, appliedRange.to);
  const monthQuery = useAnalyticsByMonth(apiClient, appliedRange, rangeValid);
  const categoryQuery = useAnalyticsByCategory(apiClient, appliedRange, rangeValid);

  const monthItems = monthQuery.data?.items ?? [];
  const categoryItems = categoryQuery.data?.items ?? [];
  const currencyCode = user?.currency_code ?? "USD";
  const summary = useMemo(() => summarize(monthItems, categoryItems), [monthItems, categoryItems]);
  const hasAnyBudget = useMemo(
    () =>
      monthItems.some((row) => (row.budget_limit_cents ?? 0) > 0) ||
      categoryItems.some((row) => (row.budget_limit_cents ?? 0) > 0),
    [monthItems, categoryItems]
  );

  const combinedError = monthQuery.error ?? categoryQuery.error ?? null;

  function applyRange() {
    if (!isValidDateRange(draftRange.from, draftRange.to)) {
      setRangeError("From date must be on or before To date.");
      return;
    }
    setRangeError(null);
    setAppliedRange(draftRange);
  }

  const hasInvalidDateRangeError =
    combinedError instanceof ApiProblemError &&
    combinedError.problem.type === "https://api.budgetbuddy.dev/problems/invalid-date-range";
  const isLoading = monthQuery.isLoading || categoryQuery.isLoading;

  return (
    <section className="space-y-4">
      <PageHeader title="Analytics" description="Track monthly trends, category concentration, and budget adherence.">
        <div className="flex flex-wrap items-end gap-3 text-sm">
          <label className="space-y-1">
            <span className="text-muted-foreground">From</span>
            <input
              type="date"
              className="block rounded-md border bg-background px-2 py-1"
              value={draftRange.from}
              onChange={(event) => setDraftRange((previous) => ({ ...previous, from: event.target.value }))}
              aria-label="From date"
            />
          </label>
          <label className="space-y-1">
            <span className="text-muted-foreground">To</span>
            <input
              type="date"
              className="block rounded-md border bg-background px-2 py-1"
              value={draftRange.to}
              onChange={(event) => setDraftRange((previous) => ({ ...previous, to: event.target.value }))}
              aria-label="To date"
            />
          </label>
          <button type="button" className="rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground" onClick={applyRange}>
            Apply
          </button>
          <label className="inline-flex items-center gap-2 text-muted-foreground">
            <input
              type="checkbox"
              checked={showBudgetOverlay}
              onChange={(event) => setShowBudgetOverlay(event.target.checked)}
            />
            Include budget overlay
          </label>
        </div>
      </PageHeader>

      {rangeError ? (
        <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">{rangeError}</div>
      ) : null}
      {combinedError ? (
        <ProblemDetailsInline
          error={combinedError}
          onRetry={() => {
            void monthQuery.refetch();
            void categoryQuery.refetch();
          }}
        />
      ) : null}
      {hasInvalidDateRangeError ? (
        <p className="text-sm text-muted-foreground">Adjust the range and apply again.</p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Total income</CardTitle></CardHeader>
          <CardContent>{formatCents(currencyCode, summary.incomeTotal)}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Total expense</CardTitle></CardHeader>
          <CardContent>{formatCents(currencyCode, summary.expenseTotal)}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Net</CardTitle></CardHeader>
          <CardContent>{formatCents(currencyCode, summary.incomeTotal - summary.expenseTotal)}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Budget usage</CardTitle></CardHeader>
          <CardContent>
            {showBudgetOverlay && summary.budgetLimit > 0
              ? `${formatCents(currencyCode, summary.budgetSpent)} / ${formatCents(currencyCode, summary.budgetLimit)}`
              : "No budget"}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Monthly trend</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading analytics...</p>
          ) : monthItems.length === 0 ? (
            <p className="text-sm text-muted-foreground">No monthly analytics for selected range.</p>
          ) : (
            <MonthTrendChart items={monthItems} currencyCode={currencyCode} showBudgetOverlay={showBudgetOverlay} />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Category breakdown</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {showBudgetOverlay && !hasAnyBudget ? (
            <p className="text-sm text-muted-foreground">No budgets set for this period.</p>
          ) : null}
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading category analytics...</p>
          ) : categoryItems.length === 0 ? (
            <p className="text-sm text-muted-foreground">No category analytics for selected range.</p>
          ) : (
            <CategoryBreakdown
              items={categoryItems}
              currencyCode={currencyCode}
              metric={metric}
              onMetricChange={setMetric}
              showBudgetOverlay={showBudgetOverlay}
            />
          )}
        </CardContent>
      </Card>
    </section>
  );
}
