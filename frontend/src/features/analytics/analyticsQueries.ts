import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getAnalyticsByCategory, getAnalyticsByMonth, getAnalyticsIncome, getImpulseSummary } from "@/api/analytics";
import { archiveBill, createBill, getBillMonthlyStatus, markBillPaid, unmarkBillPaid, updateBill } from "@/api/bills";
import { applyRollover, getRolloverPreview } from "@/api/rollover";
import type { ApiClient } from "@/api/client";
import type { BillCreate, BillPaymentCreate, BillUpdate, RolloverApplyRequest } from "@/api/types";

type AnalyticsRange = {
  from: string;
  to: string;
};

export function useAnalyticsByMonth(apiClient: ApiClient, range: AnalyticsRange, enabled: boolean) {
  return useQuery({
    queryKey: ["analytics", "by-month", { from: range.from, to: range.to }] as const,
    enabled,
    meta: { skipGlobalErrorToast: true },
    queryFn: () => getAnalyticsByMonth(apiClient, range),
    placeholderData: (previous) => previous
  });
}

export function useAnalyticsByCategory(apiClient: ApiClient, range: AnalyticsRange, enabled: boolean) {
  return useQuery({
    queryKey: ["analytics", "by-category", { from: range.from, to: range.to }] as const,
    enabled,
    meta: { skipGlobalErrorToast: true },
    queryFn: () => getAnalyticsByCategory(apiClient, range),
    placeholderData: (previous) => previous
  });
}

export function useAnalyticsIncome(apiClient: ApiClient, range: AnalyticsRange, enabled: boolean) {
  return useQuery({
    queryKey: ["analytics", "income", { from: range.from, to: range.to }] as const,
    enabled,
    meta: { skipGlobalErrorToast: true },
    queryFn: () => getAnalyticsIncome(apiClient, range),
    placeholderData: (previous) => previous
  });
}

export function useImpulseSummary(apiClient: ApiClient, range: AnalyticsRange, enabled: boolean) {
  return useQuery({
    queryKey: ["analytics", "impulse-summary", { from: range.from, to: range.to }] as const,
    enabled,
    meta: { skipGlobalErrorToast: true },
    queryFn: () => getImpulseSummary(apiClient, range),
    placeholderData: (previous) => previous
  });
}

export function useRolloverPreview(apiClient: ApiClient, month: string, enabled: boolean) {
  return useQuery({
    queryKey: ["rollover", "preview", { month }] as const,
    enabled,
    meta: { skipGlobalErrorToast: true },
    queryFn: () => getRolloverPreview(apiClient, month),
    placeholderData: (previous) => previous
  });
}

/* c8 ignore start */
export const billsKeys = {
  all: ["bills"] as const,
  monthlyStatus: (month: string) => ["bills", "monthly-status", { month }] as const
};

export function useBillMonthlyStatus(apiClient: ApiClient, month: string, enabled: boolean) {
  return useQuery({
    queryKey: billsKeys.monthlyStatus(month),
    enabled,
    meta: { skipGlobalErrorToast: true },
    queryFn: () => getBillMonthlyStatus(apiClient, month),
    placeholderData: (previous) => previous
  });
}

export function useCreateBill(apiClient: ApiClient) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: BillCreate) => createBill(apiClient, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: billsKeys.all });
    }
  });
}

export function useUpdateBill(apiClient: ApiClient) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ billId, payload }: { billId: string; payload: BillUpdate }) => updateBill(apiClient, billId, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: billsKeys.all });
    }
  });
}

export function useArchiveBill(apiClient: ApiClient) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (billId: string) => archiveBill(apiClient, billId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: billsKeys.all });
    }
  });
}

export function useMarkBillPaid(apiClient: ApiClient) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ billId, payload }: { billId: string; payload: BillPaymentCreate }) => markBillPaid(apiClient, billId, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: billsKeys.all });
      await queryClient.invalidateQueries({ queryKey: ["transactions"] });
      await queryClient.invalidateQueries({ queryKey: ["analytics"] });
    }
  });
}

export function useUnmarkBillPaid(apiClient: ApiClient) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ billId, month }: { billId: string; month: string }) => unmarkBillPaid(apiClient, billId, month),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: billsKeys.all });
      await queryClient.invalidateQueries({ queryKey: ["transactions"] });
      await queryClient.invalidateQueries({ queryKey: ["analytics"] });
    }
  });
}
/* c8 ignore stop */

export function useApplyRollover(apiClient: ApiClient) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: RolloverApplyRequest) => applyRollover(apiClient, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["analytics"] });
      await queryClient.invalidateQueries({ queryKey: ["rollover"] });
      await queryClient.invalidateQueries({ queryKey: ["transactions"] });
    }
  });
}
