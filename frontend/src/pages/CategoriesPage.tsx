import { FormEvent, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  archiveCategory,
  createCategory,
  listCategories,
  restoreCategory,
  updateCategory
} from "@/api/categories";
import { ApiProblemError } from "@/api/problem";
import type { Category, CategoryCreate, CategoryType, ProblemDetails } from "@/api/types";
import { useAuth } from "@/auth/useAuth";
import ConfirmDialog from "@/components/ConfirmDialog";
import ModalForm from "@/components/ModalForm";
import PageHeader from "@/components/PageHeader";
import ProblemBanner from "@/components/ProblemBanner";
import { appendCursorPage } from "@/lib/pagination";
import { useIsDesktop } from "@/hooks/useIsDesktop";
import { Button } from "@/ui/button";
import { Card, CardContent } from "@/ui/card";

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
  const [pageProblem, setPageProblem] = useState<ProblemDetails | null>(null);
  const [formProblem, setFormProblem] = useState<ProblemDetails | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<Category | null>(null);
  const [formState, setFormState] = useState<CategoryFormState>(EMPTY_FORM);
  const isDesktop = useIsDesktop();

  const hasMore = Boolean(nextCursor);
  const isEditing = Boolean(editing);

  function toProblemDetails(error: unknown, title: string): ProblemDetails {
    if (error instanceof ApiProblemError) {
      return (
        error.problem ?? {
          type: "about:blank",
          title,
          status: error.status
        }
      );
    }
    return {
      type: "about:blank",
      title,
      status: 500,
      detail: "Unexpected client error."
    };
  }

  const baseQueryKey = ["categories", includeArchived, typeFilter] as const;

  const categoriesQuery = useQuery({
    queryKey: baseQueryKey,
    queryFn: () =>
      listCategories(apiClient, {
        includeArchived,
        type: typeFilter,
        limit: 20
      })
  });

  const loadMoreMutation = useMutation({
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
      setPageProblem(toProblemDetails(error, "Failed to load categories"));
    }
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: CategoryCreate) => {
      if (editing) {
        await updateCategory(apiClient, editing.id, { name: payload.name, note: payload.note ?? null });
        return;
      }
      await createCategory(apiClient, payload);
    },
    onSuccess: async () => {
      setFormOpen(false);
      await queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
    onError: (error) => {
      setFormProblem(toProblemDetails(error, "Failed to save category"));
    }
  });

  const archiveMutation = useMutation({
    mutationFn: (categoryId: string) => archiveCategory(apiClient, categoryId),
    onSuccess: async () => {
      setArchiveTarget(null);
      await queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
    onError: (error) => {
      setPageProblem(toProblemDetails(error, "Failed to archive category"));
    }
  });

  const restoreMutation = useMutation({
    mutationFn: (categoryId: string) => restoreCategory(apiClient, categoryId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
    onError: (error) => {
      setPageProblem(toProblemDetails(error, "Failed to restore category"));
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
      setPageProblem(toProblemDetails(categoriesQuery.error, "Failed to load categories"));
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
        <li key={category.id} className="surface-panel space-y-2 p-3">
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
        </li>
      )),
    [items, restoringId]
  );

  return (
    <section className="space-y-4">
      <PageHeader title="Categories" description="Manage income and expense category configuration." actionLabel="New category" onAction={openCreateModal}>
        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
          <label className="inline-flex items-center gap-2">
            <span>Type</span>
            <select
              className="field-select"
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value as CategoryType | "all")}
            >
              <option value="all">All</option>
              <option value="income">income</option>
              <option value="expense">expense</option>
            </select>
          </label>
          <label className="inline-flex items-center gap-2">
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
                <table className="min-w-[620px] w-full text-sm">
                  <thead className="bg-muted/50 text-left">
                    <tr>
                      <th className="px-3 py-2">Name</th>
                      <th className="px-3 py-2">Type</th>
                      <th className="px-3 py-2">Note</th>
                      <th className="px-3 py-2">State</th>
                      <th className="px-3 py-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>{tableRows}</tbody>
                </table>
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
        <div className="grid gap-3">
          <label className="space-y-1 text-sm">
            <span>Name</span>
            <input
              className="field-input"
              value={formState.name}
              onChange={(event) => setFormState((prev) => ({ ...prev, name: event.target.value }))}
              required
            />
          </label>
          <label className="space-y-1 text-sm">
            <span>Type</span>
            <select
              className="field-select"
              value={formState.type}
              onChange={(event) => setFormState((prev) => ({ ...prev, type: event.target.value as CategoryType }))}
              disabled={isEditing}
            >
              <option value="income">income</option>
              <option value="expense">expense</option>
            </select>
          </label>
          <label className="space-y-1 text-sm">
            <span>Note</span>
            <textarea
              className="field-textarea"
              value={formState.note}
              onChange={(event) => setFormState((prev) => ({ ...prev, note: event.target.value }))}
              rows={3}
            />
          </label>
          <ProblemBanner problem={formProblem} onClose={() => setFormProblem(null)} />
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
