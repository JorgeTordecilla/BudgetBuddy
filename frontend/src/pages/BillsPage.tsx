/* c8 ignore file */
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";

import { listAccounts } from "@/api/accounts";
import { listBills } from "@/api/bills";
import { listCategories } from "@/api/categories";
import type { Bill, BillMonthlyStatusItem } from "@/api/types";
import { useAuth } from "@/auth/useAuth";
import BillForm, { type BillFieldErrors, type BillFormState } from "@/components/bills/BillForm";
import BillPayModal from "@/components/bills/BillPayModal";
import BillStatusBadge from "@/components/bills/BillStatusBadge";
import ProblemDetailsInline from "@/components/errors/ProblemDetailsInline";
import { publishSuccessToast } from "@/components/feedback/successToastStore";
import PageHeader from "@/components/PageHeader";
import {
  billsKeys,
  useArchiveBill,
  useBillMonthlyStatus,
  useCreateBill,
  useMarkBillPaid,
  useUnmarkBillPaid,
  useUpdateBill
} from "@/features/analytics/analyticsQueries";
import { Button } from "@/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/card";
import DatePickerField from "@/components/DatePickerField";
import { currentIsoMonth } from "@/utils/dates";
import { formatCents } from "@/utils/money";

const EMPTY_FORM: BillFormState = {
  name: "",
  dueDay: "",
  budget: "",
  accountId: "",
  categoryId: "",
  note: "",
  isActive: true
};

function validMonth(value: string | null): value is string {
  return Boolean(value && /^\d{4}-(0[1-9]|1[0-2])$/.test(value));
}

function normalizeBillFormState(bill: Bill): BillFormState {
  return {
    name: bill.name,
    dueDay: String(bill.due_day),
    budget: String(bill.budget_cents),
    accountId: bill.account_id,
    categoryId: bill.category_id,
    note: bill.note ?? "",
    isActive: bill.is_active
  };
}

export default function BillsPage() {
  const { apiClient, user } = useAuth();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const monthFromUrl = searchParams.get("month");
  const activeMonth = validMonth(monthFromUrl) ? monthFromUrl : currentIsoMonth();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingBill, setEditingBill] = useState<Bill | null>(null);
  const [formState, setFormState] = useState<BillFormState>(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState<BillFieldErrors>({});
  const [formProblem, setFormProblem] = useState<unknown | null>(null);

  const [payTarget, setPayTarget] = useState<BillMonthlyStatusItem | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [payProblem, setPayProblem] = useState<unknown | null>(null);

  useEffect(() => {
    if (!validMonth(monthFromUrl)) {
      setSearchParams((previous) => {
        const next = new URLSearchParams(previous);
        next.set("month", activeMonth);
        return next;
      }, { replace: true });
    }
  }, [activeMonth, monthFromUrl, setSearchParams]);

  const accountsQuery = useQuery({
    queryKey: ["accounts-options", "bills"],
    meta: { skipGlobalErrorToast: true },
    queryFn: () => listAccounts(apiClient, { includeArchived: false, limit: 100 })
  });

  const categoriesQuery = useQuery({
    queryKey: ["categories-options", "bills"],
    meta: { skipGlobalErrorToast: true },
    queryFn: () => listCategories(apiClient, { includeArchived: false, type: "expense", limit: 100 })
  });

  const billsListQuery = useQuery({
    queryKey: ["bills", "list", { includeArchived: false }],
    meta: { skipGlobalErrorToast: true },
    queryFn: () => listBills(apiClient, { includeArchived: false })
  });

  const monthlyStatusQuery = useBillMonthlyStatus(apiClient, activeMonth, true);

  const createBillMutation = useCreateBill(apiClient);
  const updateBillMutation = useUpdateBill(apiClient);
  const archiveBillMutation = useArchiveBill(apiClient);
  const markPaidMutation = useMarkBillPaid(apiClient);
  const unmarkPaidMutation = useUnmarkBillPaid(apiClient);

  const allBills = billsListQuery.data?.items ?? [];
  const statusItems = monthlyStatusQuery.data?.items ?? [];
  const summary = monthlyStatusQuery.data?.summary;

  const accountById = useMemo(() => {
    const items = accountsQuery.data?.items ?? [];
    return new Map(items.map((item) => [item.id, item.name]));
  }, [accountsQuery.data?.items]);

  const categoryById = useMemo(() => {
    const items = categoriesQuery.data?.items ?? [];
    return new Map(items.map((item) => [item.id, item.name]));
  }, [categoriesQuery.data?.items]);

  const billById = useMemo(() => {
    return new Map(allBills.map((bill) => [bill.id, bill]));
  }, [allBills]);

  const inactiveBills = useMemo(() => allBills.filter((bill) => !bill.is_active), [allBills]);

  function setFormField(field: keyof BillFormState, value: string | boolean) {
    setFormState((previous) => ({ ...previous, [field]: value }));
  }

  function openCreateForm() {
    setEditingBill(null);
    setFormState(EMPTY_FORM);
    setFieldErrors({});
    setFormProblem(null);
    setIsFormOpen(true);
  }

  function openEditForm(bill: Bill) {
    setEditingBill(bill);
    setFormState(normalizeBillFormState(bill));
    setFieldErrors({});
    setFormProblem(null);
    setIsFormOpen(true);
  }

  function closeForm() {
    if (createBillMutation.isPending || updateBillMutation.isPending) {
      return;
    }
    setIsFormOpen(false);
  }

  async function handleArchiveBill(billId: string) {
    try {
      await archiveBillMutation.mutateAsync(billId);
      publishSuccessToast("Bill archived successfully.");
    } catch (error) {
      setFormProblem(error);
    }
  }

  function validateForm(): { valid: boolean; dueDay: number; budget: number } {
    const nextErrors: BillFieldErrors = {};

    if (!formState.name.trim()) {
      nextErrors.name = "Name is required.";
    }
    const dueDay = Number(formState.dueDay);
    if (!Number.isInteger(dueDay) || dueDay < 1 || dueDay > 28) {
      nextErrors.dueDay = "Due day must be between 1 and 28.";
    }
    const budget = Number(formState.budget);
    if (!Number.isInteger(budget) || budget < 0) {
      nextErrors.budget = "Budget must be an integer amount in cents (>= 0).";
    }
    if (!formState.accountId) {
      nextErrors.accountId = "Account is required.";
    }
    if (!formState.categoryId) {
      nextErrors.categoryId = "Expense category is required.";
    }

    setFieldErrors(nextErrors);
    return { valid: Object.keys(nextErrors).length === 0, dueDay, budget };
  }

  async function handleSubmitForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormProblem(null);
    const validation = validateForm();
    if (!validation.valid) {
      return;
    }

    const payload = {
      name: formState.name.trim(),
      due_day: validation.dueDay,
      budget_cents: validation.budget,
      account_id: formState.accountId,
      category_id: formState.categoryId,
      note: formState.note.trim() || null,
      is_active: formState.isActive
    };

    try {
      if (editingBill) {
        await updateBillMutation.mutateAsync({ billId: editingBill.id, payload });
        publishSuccessToast("Bill updated successfully.");
      } else {
        await createBillMutation.mutateAsync(payload);
        publishSuccessToast("Bill created successfully.");
      }
      setIsFormOpen(false);
      await queryClient.invalidateQueries({ queryKey: billsKeys.all });
    } catch (error) {
      setFormProblem(error);
    }
  }

  function openMarkPaid(item: BillMonthlyStatusItem) {
    setPayTarget(item);
    setPayAmount(String(item.budget_cents));
    setPayProblem(null);
  }

  function closeMarkPaid() {
    if (markPaidMutation.isPending) {
      return;
    }
    setPayTarget(null);
    setPayAmount("");
    setPayProblem(null);
  }

  async function submitMarkPaid(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!payTarget) {
      return;
    }

    const amount = Number(payAmount);
    if (!Number.isInteger(amount) || amount < 0) {
      setPayProblem(new Error("Invalid amount"));
      return;
    }

    try {
      await markPaidMutation.mutateAsync({
        billId: payTarget.bill_id,
        payload: {
          month: activeMonth,
          actual_cents: amount
        }
      });
      publishSuccessToast("Bill marked as paid.");
      closeMarkPaid();
    } catch (error) {
      setPayProblem(error);
    }
  }

  async function handleUnmarkPaid(item: BillMonthlyStatusItem) {
    try {
      await unmarkPaidMutation.mutateAsync({ billId: item.bill_id, month: activeMonth });
      publishSuccessToast("Bill payment removed.");
    } catch (error) {
      setPayProblem(error);
    }
  }

  return (
    <section className="space-y-5">
      <PageHeader
        title="Bills"
        description="Track recurring bills with month-based paid, pending, and overdue states."
        actionLabel="Add bill"
        onAction={openCreateForm}
      >
        <div className="w-full max-w-xs">
          <DatePickerField
            mode="month"
            ariaLabel="Bills month"
            value={activeMonth}
            onChange={(month) => {
              setSearchParams((previous) => {
                const next = new URLSearchParams(previous);
                next.set("month", month);
                return next;
              });
            }}
          />
        </div>
      </PageHeader>

      {allBills.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <p className="text-sm text-muted-foreground">No bills yet — add your first recurring bill.</p>
            <Button type="button" className="mt-4" onClick={openCreateForm}>
              Add first bill
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Budgeted</CardTitle>
              </CardHeader>
              <CardContent className="pt-0 text-2xl font-semibold">
                {formatCents(user?.currency_code ?? "USD", summary?.total_budget_cents ?? 0)}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Paid</CardTitle>
              </CardHeader>
              <CardContent className="pt-0 text-2xl font-semibold">
                {formatCents(user?.currency_code ?? "USD", summary?.total_paid_cents ?? 0)}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Pending</CardTitle>
              </CardHeader>
              <CardContent className="pt-0 text-2xl font-semibold">
                {formatCents(user?.currency_code ?? "USD", summary?.total_pending_cents ?? 0)}
              </CardContent>
            </Card>
          </div>

          {monthlyStatusQuery.error ? <ProblemDetailsInline error={monthlyStatusQuery.error} /> : null}

          <div className="space-y-3">
            {statusItems.map((item) => {
              const bill = billById.get(item.bill_id);
              return (
                <Card key={item.bill_id} className="overflow-hidden">
                  <CardContent className="grid gap-3 p-4 sm:grid-cols-[1fr_auto] sm:items-center">
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate font-semibold">{item.name}</h3>
                        <BillStatusBadge status={item.status} />
                      </div>
                      <p className="text-sm text-muted-foreground">Due date: {item.due_date}</p>
                      <p className="text-sm text-muted-foreground">
                        Budget: {formatCents(user?.currency_code ?? "USD", item.budget_cents)}
                      </p>
                      {item.status === "paid" ? (
                        <p className="text-sm text-muted-foreground">
                          Actual: {formatCents(user?.currency_code ?? "USD", item.actual_cents ?? 0)} · Diff: {formatCents(user?.currency_code ?? "USD", item.diff_cents ?? 0)}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" variant="outline" onClick={() => bill && openEditForm(bill)}>
                        Edit
                      </Button>
                      <Button type="button" variant="outline" onClick={() => handleArchiveBill(item.bill_id)}>
                        Archive
                      </Button>
                      {item.status === "paid" ? (
                        <Button type="button" variant="outline" onClick={() => handleUnmarkPaid(item)}>
                          Unmark
                        </Button>
                      ) : (
                        <Button type="button" onClick={() => openMarkPaid(item)}>
                          Mark as paid
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {inactiveBills.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Inactive bills</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {inactiveBills.map((bill) => (
                  <div key={bill.id} className="flex items-center justify-between gap-2 rounded-md border border-border/70 p-2">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{bill.name}</p>
                      <p className="text-muted-foreground">Due day {bill.due_day}</p>
                    </div>
                    <Button type="button" variant="outline" size="sm" onClick={() => openEditForm(bill)}>
                      Edit
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null}
        </>
      )}

      <BillForm
        open={isFormOpen}
        submitting={createBillMutation.isPending || updateBillMutation.isPending}
        editing={Boolean(editingBill)}
        state={formState}
        fieldErrors={fieldErrors}
        problem={formProblem}
        accounts={accountsQuery.data?.items ?? []}
        categories={categoriesQuery.data?.items ?? []}
        onClose={closeForm}
        onSubmit={handleSubmitForm}
        onFieldChange={setFormField}
        editingBill={editingBill}
      />

      <BillPayModal
        open={Boolean(payTarget)}
        billName={payTarget?.name ?? ""}
        accountName={accountById.get(billById.get(payTarget?.bill_id ?? "")?.account_id ?? "") ?? "Unknown account"}
        categoryName={categoryById.get(billById.get(payTarget?.bill_id ?? "")?.category_id ?? "") ?? "Unknown category"}
        amount={payAmount}
        submitting={markPaidMutation.isPending}
        problem={payProblem}
        onClose={closeMarkPaid}
        onAmountChange={setPayAmount}
        onSubmit={submitMarkPaid}
      />
    </section>
  );
}
