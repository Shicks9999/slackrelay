/**
 * Simple in-memory cache with TTL for server-side use.
 * Reduces redundant DB/AI calls during a single server lifecycle.
 */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const store = new Map<string, CacheEntry<unknown>>();

export function cacheGet<T>(key: string): T | null {
  const entry = store.get(key);
  if (!entry) return null;

  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return null;
  }

  return entry.data as T;
}

export function cacheSet<T>(key: string, data: T, ttlMs: number): void {
  store.set(key, { data, expiresAt: Date.now() + ttlMs });
}

export function cacheDelete(key: string): void {
  store.delete(key);
}

export function cacheClear(): void {
  store.clear();
}

/**
 * Get-or-set pattern: returns cached value if available, otherwise calls fn() and caches the result.
 */
export async function cached<T>(
  key: string,
  ttlMs: number,
  fn: () => Promise<T>
): Promise<T> {
  const existing = cacheGet<T>(key);
  if (existing !== null) return existing;

  const data = await fn();
  cacheSet(key, data, ttlMs);
  return data;
}
