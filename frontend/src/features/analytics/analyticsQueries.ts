import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getAnalyticsByCategory, getAnalyticsByMonth, getAnalyticsIncome, getImpulseSummary } from "@/api/analytics";
import { archiveBill, createBill, getBillMonthlyStatus, markBillPaid, unmarkBillPaid, updateBill } from "@/api/bills";
import { applyRollover, getRolloverPreview } from "@/api/rollover";
import type { ApiClient } from "@/api/client";
import {
  archiveSavingsGoal,
  cancelSavingsGoal,
  completeSavingsGoal,
  createSavingsContribution,
  createSavingsGoal,
  deleteSavingsContribution,
  getSavingsSummary,
  updateSavingsGoal
} from "@/api/savings";
import type {
  BillCreate,
  BillPaymentCreate,
  BillUpdate,
  RolloverApplyRequest,
  SavingsContributionCreate,
  SavingsGoalCreate,
  SavingsGoalStatus,
  SavingsGoalUpdate
} from "@/api/types";

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

export const savingsKeys = {
  all: ["savings-goals"] as const,
  list: (status: SavingsGoalStatus | "all") => ["savings-goals", "list", { status }] as const,
  summary: ["savings-goals", "summary"] as const
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

export function useSavingsSummary(apiClient: ApiClient, enabled: boolean) {
  return useQuery({
    queryKey: savingsKeys.summary,
    enabled,
    meta: { skipGlobalErrorToast: true },
    queryFn: () => getSavingsSummary(apiClient),
    placeholderData: (previous) => previous
  });
}

export function useCreateSavingsGoal(apiClient: ApiClient) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: SavingsGoalCreate) => createSavingsGoal(apiClient, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: savingsKeys.all });
      await queryClient.invalidateQueries({ queryKey: ["transactions"] });
      await queryClient.invalidateQueries({ queryKey: ["analytics"] });
    }
  });
}

export function useUpdateSavingsGoal(apiClient: ApiClient) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ goalId, payload }: { goalId: string; payload: SavingsGoalUpdate }) => updateSavingsGoal(apiClient, goalId, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: savingsKeys.all });
      await queryClient.invalidateQueries({ queryKey: ["transactions"] });
      await queryClient.invalidateQueries({ queryKey: ["analytics"] });
    }
  });
}

export function useArchiveSavingsGoal(apiClient: ApiClient) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (goalId: string) => archiveSavingsGoal(apiClient, goalId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: savingsKeys.all });
    }
  });
}

export function useCompleteSavingsGoal(apiClient: ApiClient) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (goalId: string) => completeSavingsGoal(apiClient, goalId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: savingsKeys.all });
    }
  });
}

export function useCancelSavingsGoal(apiClient: ApiClient) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (goalId: string) => cancelSavingsGoal(apiClient, goalId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: savingsKeys.all });
    }
  });
}

export function useCreateSavingsContribution(apiClient: ApiClient) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ goalId, payload }: { goalId: string; payload: SavingsContributionCreate }) => createSavingsContribution(apiClient, goalId, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: savingsKeys.all });
      await queryClient.invalidateQueries({ queryKey: ["transactions"] });
      await queryClient.invalidateQueries({ queryKey: ["analytics"] });
    }
  });
}

export function useDeleteSavingsContribution(apiClient: ApiClient) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ goalId, contributionId }: { goalId: string; contributionId: string }) => deleteSavingsContribution(apiClient, goalId, contributionId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: savingsKeys.all });
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
