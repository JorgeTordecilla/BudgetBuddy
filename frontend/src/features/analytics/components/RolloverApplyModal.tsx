import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { listAccounts } from "@/api/accounts";
import { listCategories } from "@/api/categories";
import type { ApiClient } from "@/api/client";
import type { RolloverPreview } from "@/api/types";
import { Button } from "@/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/ui/dialog";
import { formatCents } from "@/utils/money";

type Props = {
  apiClient: ApiClient;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceMonth: string | null;
  preview: RolloverPreview | null;
  currencyCode: string;
  isSubmitting: boolean;
  onSubmit: (payload: { source_month: string; account_id: string; category_id: string }) => void;
};

export default function RolloverApplyModal({
  apiClient,
  open,
  onOpenChange,
  sourceMonth,
  preview,
  currencyCode,
  isSubmitting,
  onSubmit,
}: Props) {
  const accountsQuery = useQuery({
    queryKey: ["rollover", "accounts", "apply"] as const,
    enabled: open,
    meta: { skipGlobalErrorToast: true },
    queryFn: () => listAccounts(apiClient, { includeArchived: false, limit: 100 }),
  });

  const categoriesQuery = useQuery({
    queryKey: ["rollover", "categories", "apply"] as const,
    enabled: open,
    meta: { skipGlobalErrorToast: true },
    queryFn: () => listCategories(apiClient, { includeArchived: false, type: "income", limit: 100 }),
  });

  const accountItems = accountsQuery.data?.items ?? [];
  const categoryItems = categoriesQuery.data?.items ?? [];
  const [accountId, setAccountId] = useState("");
  const [categoryId, setCategoryId] = useState("");

  useEffect(() => {
    if (!open) {
      return;
    }
    setAccountId((current) => current || accountItems[0]?.id || "");
    setCategoryId((current) => current || categoryItems[0]?.id || "");
  }, [open, accountItems, categoryItems]);

  const disabled = useMemo(
    () =>
      isSubmitting ||
      !sourceMonth ||
      !preview ||
      preview.surplus_cents <= 0 ||
      !accountId ||
      !categoryId,
    [isSubmitting, sourceMonth, preview, accountId, categoryId]
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showClose>
        <DialogHeader>
          <DialogTitle>Apply rollover</DialogTitle>
          <DialogDescription>
            Materialize monthly surplus as an income transaction on next-month day 1.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          <p>
            Source month: <span className="font-medium">{sourceMonth ?? "-"}</span>
          </p>
          <p>
            Computed amount: <span className="font-medium">{formatCents(currencyCode, preview?.surplus_cents ?? 0)}</span>
          </p>

          <label className="block space-y-1">
            <span className="text-muted-foreground">Account</span>
            <select
              value={accountId}
              onChange={(event) => setAccountId(event.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2"
            >
              <option value="">Select account</option>
              {accountItems.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-1">
            <span className="text-muted-foreground">Income category</span>
            <select
              value={categoryId}
              onChange={(event) => setCategoryId(event.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2"
            >
              <option value="">Select income category</option>
              {categoryItems.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={disabled}
            onClick={() => {
              if (!sourceMonth) {
                return;
              }
              onSubmit({ source_month: sourceMonth, account_id: accountId, category_id: categoryId });
            }}
          >
            {isSubmitting ? "Applying..." : "Confirm apply"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
