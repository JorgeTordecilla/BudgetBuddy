import type { ResolvedProblemUi } from "@/api/problemMapping";

export type ProblemToastPayload = {
  id: string;
  problem: ResolvedProblemUi;
};

type Listener = (payload: ProblemToastPayload) => void;

const listeners = new Set<Listener>();

function makeId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function publishProblemToast(problem: ResolvedProblemUi): void {
  const payload: ProblemToastPayload = { id: makeId(), problem };
  listeners.forEach((listener) => listener(payload));
}

export function subscribeProblemToast(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

