// TTL-memoized async value. Shares the in-flight promise across concurrent
// callers (no thundering herd on cache miss) and recomputes only after the
// TTL elapses — the dashboard data changes at most once a day (the daily
// job), so a short TTL just bounds staleness after a write, not correctness.
export function memoizeWithTtl<T>(fn: () => Promise<T>, ttlMs: number): () => Promise<T> {
  let cached: { value: Promise<T>; expiresAt: number } | null = null;

  return () => {
    const now = Date.now();
    if (!cached || now >= cached.expiresAt) {
      const value = fn();
      cached = { value, expiresAt: now + ttlMs };
      // A rejected fetch shouldn't poison the cache for the next TTL window.
      value.catch(() => {
        if (cached?.value === value) cached = null;
      });
    }
    return cached.value;
  };
}
