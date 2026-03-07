import { ApiProblemError } from "@/api/errors";
import type { ProblemDetails } from "@/api/types";

export function toLocalProblem(problem: ProblemDetails): ApiProblemError {
  return new ApiProblemError(problem, {
    httpStatus: problem.status,
    requestId: null,
    retryAfter: null
  });
}
