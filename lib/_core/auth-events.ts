const listeners = new Set<() => void>();

export function subscribeAuthChanged(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function emitAuthChanged(): void {
  listeners.forEach((listener) => listener());
}
