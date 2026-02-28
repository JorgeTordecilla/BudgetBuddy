export type SuccessToastPayload = {
  id: string;
  message: string;
};

type Listener = (payload: SuccessToastPayload) => void;

const listeners = new Set<Listener>();

function makeId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function publishSuccessToast(message: string): void {
  const payload: SuccessToastPayload = { id: makeId(), message };
  listeners.forEach((listener) => listener(payload));
}

export function subscribeSuccessToast(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
