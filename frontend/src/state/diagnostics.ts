type DiagnosticState = {
  lastRequestId: string | null;
  lastProblemType: string | null;
  lastPath: string;
  lastTimestamp: string | null;
};

const state: DiagnosticState = {
  lastRequestId: null,
  lastProblemType: null,
  lastPath: typeof window !== "undefined" ? window.location.pathname : "/",
  lastTimestamp: null
};

function currentPath(): string {
  if (typeof window === "undefined") {
    return state.lastPath;
  }
  return window.location.pathname;
}

function nowIso(): string {
  return new Date().toISOString();
}

export function setLastRequestId(requestId: string | null): void {
  if (!requestId) {
    return;
  }
  state.lastRequestId = requestId;
  state.lastPath = currentPath();
  state.lastTimestamp = nowIso();
}

export function setLastProblemType(problemType: string | null, requestId?: string | null): void {
  if (requestId) {
    state.lastRequestId = requestId;
  }
  state.lastProblemType = problemType;
  state.lastPath = currentPath();
  state.lastTimestamp = nowIso();
}

export function getDiagnosticsSnapshot(): DiagnosticState {
  return {
    lastRequestId: state.lastRequestId,
    lastProblemType: state.lastProblemType,
    lastPath: currentPath(),
    lastTimestamp: state.lastTimestamp
  };
}

export function resetDiagnosticsState(): void {
  state.lastRequestId = null;
  state.lastProblemType = null;
  state.lastPath = typeof window !== "undefined" ? window.location.pathname : "/";
  state.lastTimestamp = null;
}
