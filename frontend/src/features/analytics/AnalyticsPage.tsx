import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { ApiProblemError } from "@/api/errors";
import type { AnalyticsByCategoryItem, AnalyticsByMonthItem, IncomeAnalyticsItem } from "@/api/types";
import { useAuth } from "@/auth/useAuth";
import DatePickerField from "@/components/DatePickerField";
import ProblemDetailsInline from "@/components/errors/ProblemDetailsInline";
import PageHeader from "@/components/PageHeader";
import { useAnalyticsByCategory, useAnalyticsByMonth, useAnalyticsIncome } from "@/features/analytics/analyticsQueries";
import CategoryBreakdown from "@/features/analytics/components/CategoryBreakdown";
import MonthTrendChart from "@/features/analytics/components/MonthTrendChart";
import { Button } from "@/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/card";
import { defaultAnalyticsRange, isValidDateRange } from "@/utils/dates";
import { formatCents } from "@/utils/money";
import { normalizeIsoDateParam } from "@/lib/queryState";

type MetricType = "expense" | "income";

function summarize(monthItems: AnalyticsByMonthItem[], categoryItems: AnalyticsByCategoryItem[]) {
  const incomeTotal = monthItems.reduce((sum, row) => sum + row.income_total_cents, 0);
  const expenseTotal = monthItems.reduce((sum, row) => sum + row.expense_total_cents, 0);
  const expectedIncome = monthItems.reduce((sum, row) => sum + (row.expected_income_cents ?? row.income_total_cents), 0);
  const actualIncome = monthItems.reduce((sum, row) => sum + (row.actual_income_cents ?? row.income_total_cents), 0);
  const budgetSpent = categoryItems.reduce((sum, row) => sum + (row.budget_spent_cents ?? 0), 0);
  const budgetLimit = categoryItems.reduce((sum, row) => sum + (row.budget_limit_cents ?? 0), 0);
  return { incomeTotal, expenseTotal, expectedIncome, actualIncome, budgetSpent, budgetLimit };
}

export default function AnalyticsPage() {
  const { apiClient, user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialRange = useMemo(() => {
    const from = normalizeIsoDateParam(searchParams.get("from"));
    const to = normalizeIsoDateParam(searchParams.get("to"));
    if (from && to && isValidDateRange(from, to)) {
      return { from, to };
    }
    return defaultAnalyticsRange();
  }, [searchParams]);
  const [showBudgetOverlay, setShowBudgetOverlay] = useState(true);
  const [metric, setMetric] = useState<MetricType>("expense");
  const [draftRange, setDraftRange] = useState(initialRange);
  const [appliedRange, setAppliedRange] = useState(initialRange);
  const [rangeError, setRangeError] = useState<string | null>(null);

  useEffect(() => {
    setDraftRange((previous) =>
      previous.from === initialRange.from && previous.to === initialRange.to ? previous : initialRange
    );
    setAppliedRange((previous) =>
      previous.from === initialRange.from && previous.to === initialRange.to ? previous : initialRange
    );
  }, [initialRange]);

  const rangeValid = isValidDateRange(appliedRange.from, appliedRange.to);
  const monthQuery = useAnalyticsByMonth(apiClient, appliedRange, rangeValid);
  const categoryQuery = useAnalyticsByCategory(apiClient, appliedRange, rangeValid);
  const incomeQuery = useAnalyticsIncome(apiClient, appliedRange, rangeValid);

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

  const combinedError = monthQuery.error ?? categoryQuery.error ?? incomeQuery.error ?? null;

  function applyRange() {
    if (!isValidDateRange(draftRange.from, draftRange.to)) {
      setRangeError("From date must be on or before To date.");
      return;
    }
    setRangeError(null);
    setAppliedRange(draftRange);
    const next = new URLSearchParams();
    next.set("from", draftRange.from);
    next.set("to", draftRange.to);
    if (next.toString() !== searchParams.toString()) {
      setSearchParams(next, { replace: true });
    }
  }

  const hasInvalidDateRangeError =
    combinedError instanceof ApiProblemError &&
    combinedError.problem.type === "https://api.budgetbuddy.dev/problems/invalid-date-range";
  const isLoading = monthQuery.isLoading || categoryQuery.isLoading;

  return (
    <section className="space-y-4">
      <PageHeader title="Analytics" description="Track monthly trends, category concentration, and budget adherence.">
        <div className="grid w-full grid-cols-1 gap-3 text-sm sm:flex sm:flex-wrap sm:items-end">
          <label className="min-w-0 space-y-1 sm:min-w-[11rem]">
            <span className="text-muted-foreground">From</span>
            <DatePickerField
              mode="date"
              ariaLabel="From date"
              value={draftRange.from}
              onChange={(value) => setDraftRange((previous) => ({ ...previous, from: value }))}
            />
          </label>
          <label className="min-w-0 space-y-1 sm:min-w-[11rem]">
            <span className="text-muted-foreground">To</span>
            <DatePickerField
              mode="date"
              ariaLabel="To date"
              value={draftRange.to}
              onChange={(value) => setDraftRange((previous) => ({ ...previous, to: value }))}
            />
          </label>
          <Button type="button" className="w-full sm:w-auto" onClick={applyRange}>
            Apply
          </Button>
          <label className="inline-flex min-w-0 items-center gap-2 text-muted-foreground">
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
            void incomeQuery.refetch();
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
          <CardHeader className="pb-2"><CardTitle className="text-sm">Expected income</CardTitle></CardHeader>
          <CardContent>{formatCents(currencyCode, summary.expectedIncome)}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Actual income</CardTitle></CardHeader>
          <CardContent>{formatCents(currencyCode, summary.actualIncome)}</CardContent>
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
        <CardHeader><CardTitle>Income sources breakdown</CardTitle></CardHeader>
        <CardContent>
          {incomeQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading income analytics...</p>
          ) : (incomeQuery.data?.items.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground">No income source analytics for selected range.</p>
          ) : (
            <div className="space-y-3">
              {incomeQuery.data?.items.map((item: IncomeAnalyticsItem) => (
                <div key={item.month} className="rounded-md border p-3">
                  <p className="text-sm font-semibold">{item.month}</p>
                  <p className="mb-2 text-xs text-muted-foreground">
                    Expected {formatCents(currencyCode, item.expected_income_cents)} | Actual {formatCents(currencyCode, item.actual_income_cents)}
                  </p>
                  <div className="space-y-1 text-sm">
                    {item.rows.map((row) => (
                      <div key={`${item.month}-${row.income_source_id ?? "unassigned"}`} className="flex items-center justify-between gap-2">
                        <span>{row.income_source_name}</span>
                        <span className="text-muted-foreground">
                          {formatCents(currencyCode, row.actual_income_cents)} / {formatCents(currencyCode, row.expected_income_cents)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
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
