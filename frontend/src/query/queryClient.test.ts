import { describe, expect, it, vi } from "vitest";

import { ApiProblemError } from "@/api/errors";
import * as toastStore from "@/components/errors/problemToastStore";
import { createAppQueryClient } from "@/query/queryClient";

describe("createAppQueryClient global error policy", () => {
  it("emits toast for mutation errors with toast presentation", async () => {
    const spy = vi.spyOn(toastStore, "publishProblemToast").mockImplementation(() => undefined);
    const queryClient = createAppQueryClient();

    const mutation = queryClient.getMutationCache().build(queryClient, {
      mutationFn: async () => {
        throw new ApiProblemError(
          {
            type: "https://api.budgetbuddy.dev/problems/rate-limited",
            title: "Too many requests",
            status: 429
          },
          { httpStatus: 429, requestId: "req-mutation", retryAfter: "10" }
        );
      }
    });

    await expect(mutation.execute(undefined)).rejects.toBeInstanceOf(ApiProblemError);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("skips toast when query meta opts out", async () => {
    const spy = vi.spyOn(toastStore, "publishProblemToast").mockImplementation(() => undefined);
    const queryClient = createAppQueryClient();

    queryClient.getQueryCache().build(queryClient, {
      queryKey: ["test-query"],
      queryFn: async () => {
        throw new ApiProblemError(
          {
            type: "https://api.budgetbuddy.dev/problems/forbidden",
            title: "Forbidden",
            status: 403
          },
          { httpStatus: 403, requestId: "req-query", retryAfter: null }
        );
      },
      meta: { skipGlobalErrorToast: true }
    });

    await expect(
      queryClient.fetchQuery({
        queryKey: ["test-query"],
        queryFn: async () => {
          throw new ApiProblemError(
            {
              type: "https://api.budgetbuddy.dev/problems/forbidden",
              title: "Forbidden",
              status: 403
            },
            { httpStatus: 403, requestId: "req-query", retryAfter: null }
          );
        },
        meta: { skipGlobalErrorToast: true }
      })
    ).rejects.toBeInstanceOf(ApiProblemError);

    expect(spy).not.toHaveBeenCalled();
  });
});
