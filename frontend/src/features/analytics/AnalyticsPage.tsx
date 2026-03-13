import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { ApiProblemError } from "@/api/errors";
import type { ApiClient } from "@/api/client";
import type { AnalyticsByCategoryItem, AnalyticsByMonthItem, IncomeAnalyticsItem, RolloverPreview } from "@/api/types";
import { useAuth } from "@/auth/useAuth";
import DatePickerField from "@/components/DatePickerField";
import ProblemDetailsInline from "@/components/errors/ProblemDetailsInline";
import PageHeader from "@/components/PageHeader";
import { useAnalyticsByCategory, useAnalyticsByMonth, useAnalyticsIncome, useApplyRollover, useImpulseSummary, useRolloverPreview } from "@/features/analytics/analyticsQueries";
import CategoryBreakdown from "@/features/analytics/components/CategoryBreakdown";
import MonthTrendChart from "@/features/analytics/components/MonthTrendChart";
import RolloverApplyModal from "@/features/analytics/components/RolloverApplyModal";
import { Button } from "@/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/card";
import { defaultAnalyticsRange, isValidDateRange, localIsoDateToApiUtcDate } from "@/utils/dates";
import { formatCents } from "@/utils/money";
import { normalizeIsoDateParam } from "@/lib/queryState";

type MetricType = "expense" | "income";
type RolloverSelection = { sourceMonth: string; preview: RolloverPreview };

function summarize(monthItems: AnalyticsByMonthItem[], categoryItems: AnalyticsByCategoryItem[]) {
  const incomeTotal = monthItems.reduce((sum, row) => sum + row.income_total_cents, 0);
  const expenseTotal = monthItems.reduce((sum, row) => sum + row.expense_total_cents, 0);
  const expectedIncome = monthItems.reduce((sum, row) => sum + (row.expected_income_cents ?? row.income_total_cents), 0);
  const actualIncome = monthItems.reduce((sum, row) => sum + (row.actual_income_cents ?? row.income_total_cents), 0);
  const budgetSpent = categoryItems.reduce((sum, row) => sum + (row.budget_spent_cents ?? 0), 0);
  const budgetLimit = categoryItems.reduce((sum, row) => sum + (row.budget_limit_cents ?? 0), 0);
  return { incomeTotal, expenseTotal, expectedIncome, actualIncome, budgetSpent, budgetLimit };
}

type RolloverMonthStatusProps = {
  apiClient: ApiClient;
  month: string;
  fallbackSurplusCents: number;
  onApply: (selection: RolloverSelection) => void;
};

function RolloverMonthStatus({ apiClient, month, fallbackSurplusCents, onApply }: RolloverMonthStatusProps) {
  const previewQuery = useRolloverPreview(apiClient, month, true);

  if (previewQuery.isLoading) {
    return <span className="text-xs text-muted-foreground">Checking...</span>;
  }
  if (previewQuery.error) {
    return <span className="text-xs text-rose-600">Preview error</span>;
  }

  const preview = previewQuery.data;
  if (!preview) {
    return <span className="text-xs text-muted-foreground">No data</span>;
  }
  if (preview.already_applied) {
    return <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-700">Applied</span>;
  }
  if (preview.surplus_cents <= 0 && fallbackSurplusCents <= 0) {
    return <span className="text-xs text-muted-foreground">No surplus</span>;
  }

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      onClick={() => onApply({ sourceMonth: month, preview })}
    >
      Apply rollover →
    </Button>
  );
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
  const [rolloverSelection, setRolloverSelection] = useState<RolloverSelection | null>(null);

  useEffect(() => {
    setDraftRange((previous) =>
      previous.from === initialRange.from && previous.to === initialRange.to ? previous : initialRange
    );
    setAppliedRange((previous) =>
      previous.from === initialRange.from && previous.to === initialRange.to ? previous : initialRange
    );
  }, [initialRange]);

  const rangeValid = isValidDateRange(appliedRange.from, appliedRange.to);
  const apiAppliedRange = useMemo(
    () => ({
      from: localIsoDateToApiUtcDate(appliedRange.from),
      to: localIsoDateToApiUtcDate(appliedRange.to)
    }),
    [appliedRange.from, appliedRange.to]
  );
  const monthQuery = useAnalyticsByMonth(apiClient, apiAppliedRange, rangeValid);
  const categoryQuery = useAnalyticsByCategory(apiClient, apiAppliedRange, rangeValid);
  const incomeQuery = useAnalyticsIncome(apiClient, apiAppliedRange, rangeValid);
  const impulseSummaryQuery = useImpulseSummary(apiClient, apiAppliedRange, rangeValid);
  const applyRolloverMutation = useApplyRollover(apiClient);

  const monthItems = monthQuery.data?.items ?? [];
  const categoryItems = categoryQuery.data?.items ?? [];
  const currencyCode = user?.currency_code ?? "USD";
  const summary = useMemo(() => summarize(monthItems, categoryItems), [monthItems, categoryItems]);
  const rolloverInLatest = monthItems[monthItems.length - 1]?.rollover_in_cents ?? 0;
  const hasAnyBudget = useMemo(
    () =>
      monthItems.some((row) => (row.budget_limit_cents ?? 0) > 0) ||
      categoryItems.some((row) => (row.budget_limit_cents ?? 0) > 0),
    [monthItems, categoryItems]
  );

  const combinedError = monthQuery.error ?? categoryQuery.error ?? incomeQuery.error ?? null;
  const impulseSummary = impulseSummaryQuery.data;
  const impulseSummaryContent = (() => {
    if (!impulseSummary) {
      return <p className="text-sm text-muted-foreground">No tagged transactions yet.</p>;
    }
    if (
      impulseSummary.impulse_count === 0 &&
      impulseSummary.intentional_count === 0 &&
      impulseSummary.untagged_count === 0
    ) {
      return <p className="text-sm text-muted-foreground">No tagged transactions yet.</p>;
    }
    return (
      <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Impulse</CardTitle></CardHeader>
            <CardContent>{impulseSummary.impulse_count}</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Intentional</CardTitle></CardHeader>
            <CardContent>{impulseSummary.intentional_count}</CardContent>
          </Card>
        </div>
        <div>
          <p className="mb-2 text-sm font-medium">Top impulse categories</p>
          {impulseSummary.top_impulse_categories.length === 0 ? (
            <p className="text-sm text-muted-foreground">No impulse purchases tagged yet.</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {impulseSummary.top_impulse_categories.map((item) => (
                <li key={item.category_id} className="flex items-center justify-between gap-2">
                  <span>{item.category_name}</span>
                  <span className="text-muted-foreground">{item.count}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    );
  })();

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
          <CardHeader className="pb-2"><CardTitle className="text-sm">Rollover in</CardTitle></CardHeader>
          <CardContent>{formatCents(currencyCode, rolloverInLatest)}</CardContent>
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

      <Card>
        <CardHeader><CardTitle>Impulse behavior</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {impulseSummaryQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading impulse summary...</p>
          ) : impulseSummaryQuery.error ? (
            <ProblemDetailsInline error={impulseSummaryQuery.error} />
          ) : impulseSummaryContent}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Rollover</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {monthItems.length === 0 ? (
            <p className="text-sm text-muted-foreground">No monthly rows available for rollover actions.</p>
          ) : (
            <div className="space-y-2">
              {monthItems.map((item) => (
                <div key={`rollover-${item.month}`} className="flex items-center justify-between rounded-md border p-3">
                  <div>
                    <p className="text-sm font-medium">{item.month}</p>
                    <p className="text-xs text-muted-foreground">
                      Surplus preview: {formatCents(currencyCode, item.rollover_in_cents ?? 0)}
                    </p>
                  </div>
                  <RolloverMonthStatus
                    apiClient={apiClient}
                    month={item.month}
                    fallbackSurplusCents={item.rollover_in_cents ?? 0}
                    onApply={setRolloverSelection}
                  />
                </div>
              ))}
            </div>
          )}
          {applyRolloverMutation.error ? (
            <ProblemDetailsInline
              error={applyRolloverMutation.error}
              onRetry={() => undefined}
            />
          ) : null}
        </CardContent>
      </Card>

      <RolloverApplyModal
        apiClient={apiClient}
        open={rolloverSelection !== null}
        onOpenChange={(open) => {
          if (!open) {
            setRolloverSelection(null);
          }
        }}
        sourceMonth={rolloverSelection?.sourceMonth ?? null}
        preview={rolloverSelection?.preview ?? null}
        currencyCode={currencyCode}
        isSubmitting={applyRolloverMutation.isPending}
        onSubmit={(payload) => {
          applyRolloverMutation.mutate(payload, {
            onSuccess: () => {
              setRolloverSelection(null);
            }
          });
        }}
      />
    </section>
  );
}
