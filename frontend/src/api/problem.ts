import type { ProblemDetails } from "@/api/types";

export class ApiProblemError extends Error {
  readonly problem: ProblemDetails | null;
  readonly status: number;

  constructor(status: number, problem: ProblemDetails | null, fallbackMessage = "request_failed") {
    super(problem?.title ?? fallbackMessage);
    this.name = "ApiProblemError";
    this.problem = problem;
    this.status = status;
  }
}
