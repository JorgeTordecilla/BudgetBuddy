export type CursorPage<T> = {
  items: T[];
  nextCursor: string | null;
};

export function appendCursorPage<T>(previous: CursorPage<T>, incoming: CursorPage<T>): CursorPage<T> {
  return {
    items: [...previous.items, ...incoming.items],
    nextCursor: incoming.nextCursor
  };
}
