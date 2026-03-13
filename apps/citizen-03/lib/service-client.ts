/**
 * ServiceClient — fetches data from Studio's API.
 *
 * Features:
 * - TTL cache (default 60s)
 * - Request deduplication
 * - 5s timeout via AbortController
 * - Returns null on any error (caller falls back to filesystem)
 */

interface CacheEntry<T> {
  data: T;
  ts: number;
}

export class ServiceClient {
  private baseUrl: string;
  private ttl: number;
  private timeout: number;
  private cache = new Map<string, CacheEntry<unknown>>();
  private inflight = new Map<string, Promise<unknown>>();

  constructor(baseUrl: string, options?: { ttl?: number; timeout?: number }) {
    this.baseUrl = baseUrl.replace(/\/+$/, "");
    this.ttl = options?.ttl ?? 60_000;
    this.timeout = options?.timeout ?? 5_000;
  }

  /** GET /api/personas — returns { users: [...] } or null */
  async getPersonas(): Promise<{ users: Array<Record<string, unknown>> } | null> {
    return this.fetchJson("/api/personas");
  }

  private async fetchJson<T>(path: string): Promise<T | null> {
    const key = path;
    const cached = this.cache.get(key) as CacheEntry<T> | undefined;
    if (cached && Date.now() - cached.ts < this.ttl) {
      return cached.data;
    }

    const existing = this.inflight.get(key);
    if (existing) {
      return existing as Promise<T | null>;
    }

    const promise = this.doFetch<T>(key);
    this.inflight.set(key, promise);
    try {
      return await promise;
    } finally {
      this.inflight.delete(key);
    }
  }

  private async doFetch<T>(path: string): Promise<T | null> {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeout);
      const res = await fetch(`${this.baseUrl}${path}`, {
        signal: controller.signal,
        headers: { Accept: "application/json" },
      });
      clearTimeout(timer);
      if (!res.ok) return null;
      const data = (await res.json()) as T;
      this.cache.set(path, { data, ts: Date.now() });
      return data;
    } catch {
      return null;
    }
  }
}

/** Singleton ServiceClient — only created if STUDIO_API_URL is set */
let _client: ServiceClient | null | undefined;

export function getServiceClient(): ServiceClient | null {
  const url = process.env.STUDIO_API_URL;
  if (!url) return null;
  if (!_client) {
    _client = new ServiceClient(url);
    console.log(`[ServiceClient] Connecting to Studio at ${url}`);
  }
  return _client;
}
