/** Small in-memory cache, used when no shared store is set up. Oldest entries go first. */
export function createTtlCache<V>({ maxEntries, ttlMs }: { maxEntries: number; ttlMs: number }) {
  const store = new Map<string, { value: V; expires: number }>();

  return {
    get(key: string, now: number = Date.now()): V | undefined {
      const entry = store.get(key);
      if (!entry) return undefined;
      if (entry.expires <= now) {
        store.delete(key);
        return undefined;
      }
      return entry.value;
    },
    set(key: string, value: V, now: number = Date.now()): void {
      store.delete(key);
      const oldest = store.keys().next();
      if (store.size >= maxEntries && !oldest.done) store.delete(oldest.value);
      store.set(key, { value, expires: now + ttlMs });
    },
  };
}
