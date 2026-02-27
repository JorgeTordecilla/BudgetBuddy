import { ApiProblemError as NormalizedApiProblemError } from "@/api/errors";
import type { ProblemDetails } from "@/api/types";

export class ApiProblemError extends NormalizedApiProblemError {
  constructor(status: number, problem: ProblemDetails | null, fallbackMessage = "request_failed") {
    super(problem ?? { type: "about:blank", title: fallbackMessage, status }, {
      httpStatus: status,
      requestId: null,
      retryAfter: null
    });
  }
}
