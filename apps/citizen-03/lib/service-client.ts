/**
 * ServiceClient — fetches data from Studio's API.
 *
 * Features:
 * - TTL cache (default 60s)
 * - Request deduplication
 * - 5s timeout via AbortController
 * - Cloudflare service binding support via getCloudflareContext()
 * - Returns null on any error (caller falls back to filesystem)
 */

/** Minimal Fetcher interface — matches Cloudflare Service Binding */
interface Fetcher {
  fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
}

interface CacheEntry<T> {
  data: T;
  ts: number;
}

export class ServiceClient {
  private baseUrl: string;
  private ttl: number;
  private timeout: number;
  private fetcher: Fetcher | undefined;
  private cache = new Map<string, CacheEntry<unknown>>();
  private inflight = new Map<string, Promise<unknown>>();

  constructor(baseUrl: string, options?: { ttl?: number; timeout?: number; fetcher?: Fetcher }) {
    this.baseUrl = baseUrl.replace(/\/+$/, "");
    this.ttl = options?.ttl ?? 60_000;
    this.timeout = options?.timeout ?? 5_000;
    this.fetcher = options?.fetcher;
  }

  /** GET /api/personas — returns { users: [...] } or null */
  async getPersonas(): Promise<{ users: Array<Record<string, unknown>> } | null> {
    return this.fetchJson("/api/personas");
  }

  /** GET /api/personas/:id — returns { user: {...} } or null */
  async getPersona(id: string): Promise<{ user: Record<string, unknown> } | null> {
    return this.fetchJson(`/api/personas/${encodeURIComponent(id)}`);
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

      const url = `${this.baseUrl}${path}`;
      const init: RequestInit = {
        signal: controller.signal,
        headers: { Accept: "application/json" },
      };

      const doFetch = this.fetcher
        ? this.fetcher.fetch.bind(this.fetcher)
        : globalThis.fetch;
      const res = await doFetch(url, init);
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

/** Resolve STUDIO_API_URL and optional service binding from env */
async function resolveStudioConfig(): Promise<{ url?: string; fetcher?: Fetcher }> {
  // On Cloudflare Workers with OpenNext, check for service binding + vars first
  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { env } = getCloudflareContext() as any;
    const url = env?.STUDIO_API_URL as string | undefined;
    const fetcher = env?.STUDIO as Fetcher | undefined;
    if (url || fetcher) return { url, fetcher };
  } catch {
    // Not on Cloudflare — fall through to process.env
  }
  // Local dev: use process.env
  if (process.env.STUDIO_API_URL) {
    return { url: process.env.STUDIO_API_URL };
  }
  return {};
}

/** Singleton ServiceClient — only created if STUDIO_API_URL is set */
let _client: ServiceClient | null | undefined;
let _resolvedUrl: string | undefined;

export async function getServiceClient(): Promise<ServiceClient | null> {
  const { url, fetcher } = await resolveStudioConfig();
  if (!url) return null;

  if (_client && _resolvedUrl === url) return _client;

  _resolvedUrl = url;
  _client = new ServiceClient(url, { fetcher });
  const mode = fetcher ? "service binding" : "public URL";
  console.log(`[ServiceClient] Connecting to Studio at ${url} (${mode})`);
  return _client;
}
