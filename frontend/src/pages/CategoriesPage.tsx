import { FormEvent, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  archiveCategory,
  createCategory,
  listCategories,
  restoreCategory,
  updateCategory
} from "@/api/categories";
import type { Category, CategoryCreate, CategoryType } from "@/api/types";
import { useAuth } from "@/auth/useAuth";
import ConfirmDialog from "@/components/ConfirmDialog";
import ModalForm from "@/components/ModalForm";
import PageHeader from "@/components/PageHeader";
import SelectField from "@/components/SelectField";
import ProblemDetailsInline from "@/components/errors/ProblemDetailsInline";
import ProblemBanner from "@/components/ProblemBanner";
import { publishSuccessToast } from "@/components/feedback/successToastStore";
import { appendCursorPage } from "@/lib/pagination";
import { useIsDesktop } from "@/hooks/useIsDesktop";
import { Button } from "@/ui/button";
import { Card, CardContent } from "@/ui/card";
import { Input } from "@/ui/input";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/ui/table";
import { Textarea } from "@/ui/textarea";

type CategoryFormState = {
  name: string;
  type: CategoryType;
  note: string;
};

const EMPTY_FORM: CategoryFormState = {
  name: "",
  type: "expense",
  note: ""
};

function dedupeById(items: Category[]): Category[] {
  const map = new Map<string, Category>();
  items.forEach((item) => map.set(item.id, item));
  return [...map.values()];
}

export default function CategoriesPage() {
  const { apiClient } = useAuth();
  const queryClient = useQueryClient();
  const [typeFilter, setTypeFilter] = useState<CategoryType | "all">("all");
  const [includeArchived, setIncludeArchived] = useState(false);
  const [items, setItems] = useState<Category[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [pageProblem, setPageProblem] = useState<unknown | null>(null);
  const [formProblem, setFormProblem] = useState<unknown | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<Category | null>(null);
  const [formState, setFormState] = useState<CategoryFormState>(EMPTY_FORM);
  const isDesktop = useIsDesktop();

  const hasMore = Boolean(nextCursor);
  const isEditing = Boolean(editing);

  const baseQueryKey = ["categories", includeArchived, typeFilter] as const;

  const categoriesQuery = useQuery({
    queryKey: baseQueryKey,
    meta: { skipGlobalErrorToast: true },
    queryFn: () =>
      listCategories(apiClient, {
        includeArchived,
        type: typeFilter,
        limit: 20
      })
  });

  const loadMoreMutation = useMutation({
    meta: { skipGlobalErrorToast: true },
    mutationFn: (cursor: string) =>
      listCategories(apiClient, {
        includeArchived,
        type: typeFilter,
        cursor,
        limit: 20
      }),
    onSuccess: (response) => {
      const merged = appendCursorPage({ items, nextCursor }, { items: response.items, nextCursor: response.next_cursor });
      setItems(dedupeById(merged.items));
      setNextCursor(response.next_cursor);
    },
    onError: (error) => {
      setPageProblem(error);
    }
  });

  const saveMutation = useMutation({
    meta: { skipGlobalErrorToast: true },
    mutationFn: async (payload: CategoryCreate) => {
      if (editing) {
        await updateCategory(apiClient, editing.id, { name: payload.name, note: payload.note ?? null });
        return;
      }
      await createCategory(apiClient, payload);
    },
    onSuccess: async () => {
      publishSuccessToast(editing ? "Category updated successfully." : "Category created successfully.");
      setFormOpen(false);
      await queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
    onError: (error) => {
      setFormProblem(error);
    }
  });

  const archiveMutation = useMutation({
    meta: { skipGlobalErrorToast: true },
    mutationFn: (categoryId: string) => archiveCategory(apiClient, categoryId),
    onSuccess: async () => {
      publishSuccessToast("Category archived successfully.");
      setArchiveTarget(null);
      await queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
    onError: (error) => {
      setPageProblem(error);
    }
  });

  const restoreMutation = useMutation({
    meta: { skipGlobalErrorToast: true },
    mutationFn: (categoryId: string) => restoreCategory(apiClient, categoryId),
    onSuccess: async () => {
      publishSuccessToast("Category restored successfully.");
      await queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
    onError: (error) => {
      setPageProblem(error);
    }
  });

  useEffect(() => {
    if (categoriesQuery.data) {
      setItems(categoriesQuery.data.items);
      setNextCursor(categoriesQuery.data.next_cursor);
      setPageProblem(null);
    }
  }, [categoriesQuery.data]);

  useEffect(() => {
    if (categoriesQuery.error) {
      setPageProblem(categoriesQuery.error);
    }
  }, [categoriesQuery.error]);

  useEffect(() => {
    setPageProblem(null);
  }, [includeArchived, typeFilter]);

  function openCreateModal() {
    setEditing(null);
    setFormProblem(null);
    setFormState(EMPTY_FORM);
    setFormOpen(true);
  }

  function openEditModal(category: Category) {
    setEditing(category);
    setFormProblem(null);
    setFormState({
      name: category.name,
      type: category.type,
      note: category.note ?? ""
    });
    setFormOpen(true);
  }

  function parseFormPayload(): CategoryCreate {
    return {
      name: formState.name.trim(),
      type: formState.type,
      note: formState.note.trim() ? formState.note.trim() : undefined
    };
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormProblem(null);
    const payload = parseFormPayload();
    try {
      await saveMutation.mutateAsync(payload);
    } catch {
      // handled by mutation onError
    }
  }

  async function handleArchive() {
    if (!archiveTarget) {
      return;
    }
    setPageProblem(null);
    try {
      await archiveMutation.mutateAsync(archiveTarget.id);
    } catch {
      // handled by mutation onError
    }
  }

  async function handleRestore(categoryId: string) {
    setRestoringId(categoryId);
    setPageProblem(null);
    try {
      await restoreMutation.mutateAsync(categoryId);
    } catch {
      // handled by mutation onError
    } finally {
      setRestoringId(null);
    }
  }

  const tableRows = useMemo(() => {
    return items.map((category) => (
      <tr key={category.id} className="border-t">
        <td className="px-3 py-2 font-medium">{category.name}</td>
        <td className="px-3 py-2">{category.type}</td>
        <td className="px-3 py-2">{category.note ?? "-"}</td>
        <td className="px-3 py-2">{category.archived_at ? "Archived" : "Active"}</td>
        <td className="px-3 py-2 text-right">
          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => openEditModal(category)}>
              Edit
            </Button>
            {category.archived_at ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={restoringId === category.id}
                onClick={() => void handleRestore(category.id)}
              >
                {restoringId === category.id ? "Restoring..." : "Restore"}
              </Button>
            ) : (
              <Button type="button" size="sm" onClick={() => setArchiveTarget(category)}>
                Archive
              </Button>
            )}
          </div>
        </td>
      </tr>
    ));
  }, [items, restoringId]);
  const mobileCards = useMemo(
    () =>
      items.map((category) => (
        <li key={category.id}>
          <Card>
            <CardContent className="space-y-2 p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold">{category.name}</p>
                  <p className="text-xs uppercase text-muted-foreground">{category.type}</p>
                </div>
                <span className="rounded-full border border-border/70 bg-muted/60 px-2 py-1 text-[11px] font-semibold">
                  {category.archived_at ? "Archived" : "Active"}
                </span>
              </div>
              {category.note ? <p className="text-xs text-muted-foreground">{category.note}</p> : null}
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => openEditModal(category)}>
                  Edit
                </Button>
                {category.archived_at ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={restoringId === category.id}
                    onClick={() => void handleRestore(category.id)}
                  >
                    {restoringId === category.id ? "Restoring..." : "Restore"}
                  </Button>
                ) : (
                  <Button type="button" size="sm" onClick={() => setArchiveTarget(category)}>
                    Archive
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </li>
      )),
    [items, restoringId]
  );

  return (
    <section className="space-y-4">
      <PageHeader title="Categories" description="Manage income and expense category configuration." actionLabel="New category" onAction={openCreateModal}>
        <div className="grid w-full grid-cols-1 gap-3 text-sm text-muted-foreground sm:flex sm:flex-wrap sm:items-end sm:gap-4">
          <label className="min-w-0 space-y-1 sm:min-w-[11rem]">
            <span className="block">Type</span>
            <SelectField
              ariaLabel="Type"
              value={typeFilter}
              onChange={(value) => setTypeFilter(value as CategoryType | "all")}
              options={[
                { value: "all", label: "All" },
                { value: "income", label: "income" },
                { value: "expense", label: "expense" }
              ]}
            />
          </label>
          <label className="inline-flex min-w-0 items-center gap-2">
            <input
              type="checkbox"
              checked={includeArchived}
              onChange={(event) => setIncludeArchived(event.target.checked)}
            />
            Show archived
          </label>
        </div>
      </PageHeader>

      <ProblemBanner problem={pageProblem} onClose={() => setPageProblem(null)} />

      <Card className="animate-rise-in">
        <CardContent className="p-0">
          {categoriesQuery.isLoading ? (
            <div className="p-4 text-sm text-muted-foreground">Loading categories...</div>
          ) : items.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground">No categories found.</div>
          ) : (
            <div className="space-y-3 p-3 sm:p-4">
              {!isDesktop ? <ul className="space-y-3">{mobileCards}</ul> : null}
              {isDesktop ? (
                <div className="overflow-x-auto">
                  <Table className="min-w-[620px]">
                    <TableHeader className="bg-muted/50 text-left">
                      <TableRow>
                        <TableHead className="px-3 py-2">Name</TableHead>
                        <TableHead className="px-3 py-2">Type</TableHead>
                        <TableHead className="px-3 py-2">Note</TableHead>
                        <TableHead className="px-3 py-2">State</TableHead>
                        <TableHead className="px-3 py-2 text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>{tableRows}</TableBody>
                  </Table>
                </div>
              ) : null}
            </div>
          )}
        </CardContent>
      </Card>

      {hasMore ? (
        <div className="mt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              if (nextCursor) {
                loadMoreMutation.mutate(nextCursor);
              }
            }}
            disabled={loadMoreMutation.isPending}
          >
            {loadMoreMutation.isPending ? "Loading..." : "Load more"}
          </Button>
        </div>
      ) : null}

      <ModalForm
        open={formOpen}
        title={isEditing ? "Edit category" : "Create category"}
        description="Use type-specific categories to keep analytics coherent."
        submitLabel={isEditing ? "Save changes" : "Create category"}
        submitting={saveMutation.isPending}
        onClose={() => setFormOpen(false)}
        onSubmit={handleSubmit}
      >
        <div className="grid gap-3 overflow-x-hidden">
          <label className="min-w-0 space-y-1 text-sm">
            <span>Name</span>
            <Input
              className="field-input"
              value={formState.name}
              onChange={(event) => setFormState((prev) => ({ ...prev, name: event.target.value }))}
              required
            />
          </label>
          <label className="min-w-0 space-y-1 text-sm">
            <span>Type</span>
            <SelectField
              ariaLabel="Type"
              value={formState.type}
              onChange={(value) => setFormState((prev) => ({ ...prev, type: value as CategoryType }))}
              disabled={isEditing}
              options={[
                { value: "income", label: "income" },
                { value: "expense", label: "expense" }
              ]}
            />
          </label>
          <label className="min-w-0 space-y-1 text-sm">
            <span>Note</span>
            <Textarea
              className="field-textarea"
              value={formState.note}
              onChange={(event) => setFormState((prev) => ({ ...prev, note: event.target.value }))}
              rows={3}
            />
          </label>
          {formProblem ? <ProblemDetailsInline error={formProblem} onDismiss={() => setFormProblem(null)} /> : null}
        </div>
      </ModalForm>

      <ConfirmDialog
        open={Boolean(archiveTarget)}
        title="Archive category?"
        description={archiveTarget ? `This will archive "${archiveTarget.name}".` : "This action archives the selected category."}
        confirmLabel="Archive"
        confirming={archiveMutation.isPending}
        onCancel={() => setArchiveTarget(null)}
        onConfirm={handleArchive}
      />
    </section>
  );
}
