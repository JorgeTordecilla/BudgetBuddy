export const optionQueryKeys = {
  accounts: (params: { includeArchived: boolean; limit: number }) =>
    ["accounts", { includeArchived: params.includeArchived, limit: params.limit }] as const,
  categories: (params: { includeArchived: boolean; type: "all" | "income" | "expense"; limit: number }) =>
    ["categories", { includeArchived: params.includeArchived, type: params.type, limit: params.limit }] as const,
  incomeSources: (params: { includeArchived: boolean }) =>
    ["income-sources", { includeArchived: params.includeArchived }] as const
};
