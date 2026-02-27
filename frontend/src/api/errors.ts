import type { ProblemDetails } from "@/api/types";
import { setLastProblemType, setLastRequestId } from "@/state/diagnostics";

const PROBLEM_MEDIA_TYPE = "application/problem+json";

export type ApiErrorBase = {
  httpStatus: number;
  requestId: string | null;
  retryAfter: string | null;
};

export class ApiProblemError extends Error implements ApiErrorBase {
  readonly name = "ApiProblemError";
  readonly httpStatus: number;
  readonly requestId: string | null;
  readonly retryAfter: string | null;
  readonly problem: ProblemDetails;

  constructor(problem: ProblemDetails, meta: ApiErrorBase) {
    super(problem.title || "Request failed");
    this.problem = problem;
    this.httpStatus = meta.httpStatus;
    this.requestId = meta.requestId;
    this.retryAfter = meta.retryAfter;
  }

  get status(): number {
    return this.httpStatus;
  }
}

export class ApiUnknownError extends Error implements ApiErrorBase {
  readonly name = "ApiUnknownError";
  readonly httpStatus: number;
  readonly requestId: string | null;
  readonly retryAfter: string | null;

  constructor(message: string, meta: ApiErrorBase) {
    super(message || "Unexpected error");
    this.httpStatus = meta.httpStatus;
    this.requestId = meta.requestId;
    this.retryAfter = meta.retryAfter;
  }

  get status(): number {
    return this.httpStatus;
  }
}

export class ApiNetworkError extends Error {
  readonly name = "ApiNetworkError";
  readonly httpStatus = 0;
  readonly requestId = null;
  readonly retryAfter = null;

  constructor(message = "Network error. Check your connection.") {
    super(message);
  }
}

export type NormalizedApiError = ApiProblemError | ApiUnknownError | ApiNetworkError;

function readHeader(response: Response, name: string): string | null {
  return response.headers.get(name);
}

export async function parseProblemDetails(response: Response): Promise<ProblemDetails | null> {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes(PROBLEM_MEDIA_TYPE)) {
    return null;
  }
  try {
    return (await response.clone().json()) as ProblemDetails;
  } catch {
    return null;
  }
}

export async function toApiError(input: Response | unknown, fallbackMessage = "Unexpected error"): Promise<NormalizedApiError> {
  if (input instanceof Response) {
    const headerRequestId = readHeader(input, "X-Request-Id");
    setLastRequestId(headerRequestId);
    const meta: ApiErrorBase = {
      httpStatus: input.status,
      requestId: headerRequestId,
      retryAfter: readHeader(input, "Retry-After")
    };
    const problem = await parseProblemDetails(input);
    if (problem) {
      setLastProblemType(problem.type, meta.requestId);
      return new ApiProblemError(problem, meta);
    }
    setLastProblemType("about:blank", meta.requestId);
    return new ApiUnknownError(fallbackMessage, meta);
  }

  if (input instanceof ApiProblemError || input instanceof ApiUnknownError || input instanceof ApiNetworkError) {
    return input;
  }

  if (input instanceof TypeError) {
    return new ApiNetworkError();
  }

  if (input instanceof Error) {
    return new ApiUnknownError(input.message || fallbackMessage, {
      httpStatus: 0,
      requestId: null,
      retryAfter: null
    });
  }

  return new ApiUnknownError(fallbackMessage, {
    httpStatus: 0,
    requestId: null,
    retryAfter: null
  });
}

export async function throwApiError(response: Response, fallbackMessage: string): Promise<never> {
  throw await toApiError(response, fallbackMessage);
}

export function getProblem(error: unknown): ProblemDetails | null {
  if (error instanceof ApiProblemError) {
    return error.problem;
  }
  return null;
}
