import type { ApiClient } from "@/api/client";
import { throwApiError } from "@/api/errors";
import type {
  CategoriesListResponse,
  Category,
  CategoryCreate,
  CategoryType,
  CategoryUpdate
} from "@/api/types";

export type ListCategoriesParams = {
  includeArchived?: boolean;
  type?: CategoryType | "all";
  cursor?: string | null;
  limit?: number;
};

function buildCategoriesQuery(params: ListCategoriesParams = {}): string {
  const search = new URLSearchParams();
  search.set("include_archived", String(Boolean(params.includeArchived)));
  if (params.type && params.type !== "all") {
    search.set("type", params.type);
  }
  if (params.cursor) {
    search.set("cursor", params.cursor);
  }
  if (params.limit && params.limit > 0) {
    search.set("limit", String(params.limit));
  }
  return search.toString();
}

export async function listCategories(client: ApiClient, params: ListCategoriesParams = {}): Promise<CategoriesListResponse> {
  const query = buildCategoriesQuery(params);
  const response = await client.request(`/categories?${query}`, { method: "GET" });
  if (!response.ok) {
    await throwApiError(response, "categories_list_failed");
  }
  return (await response.json()) as CategoriesListResponse;
}

export async function createCategory(client: ApiClient, payload: CategoryCreate): Promise<Category> {
  const response = await client.request("/categories", {
    method: "POST",
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    await throwApiError(response, "categories_create_failed");
  }
  return (await response.json()) as Category;
}

export async function updateCategory(client: ApiClient, categoryId: string, payload: CategoryUpdate): Promise<Category> {
  const response = await client.request(`/categories/${categoryId}`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    await throwApiError(response, "categories_update_failed");
  }
  return (await response.json()) as Category;
}

export async function archiveCategory(client: ApiClient, categoryId: string): Promise<void> {
  const response = await client.request(`/categories/${categoryId}`, { method: "DELETE" });
  if (!response.ok) {
    await throwApiError(response, "categories_archive_failed");
  }
}

export async function restoreCategory(client: ApiClient, categoryId: string): Promise<Category> {
  return updateCategory(client, categoryId, { archived_at: null });
}
