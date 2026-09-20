/** Minimal in-memory CacheStorage for tests (jsdom has none). Keys are absolute URLs. */
export function makeFakeCaches() {
  const store = new Map<string, Map<string, Response>>();
  const urlOf = (request: RequestInfo | URL) =>
    typeof request === "string" ? new URL(request).href : request instanceof URL ? request.href : request.url;

  function cacheNamed(name: string) {
    if (!store.has(name)) store.set(name, new Map());
    const entries = store.get(name)!;
    return {
      async put(request: RequestInfo | URL, response: Response) {
        entries.set(urlOf(request), response);
      },
      async match(request: RequestInfo | URL) {
        return entries.get(urlOf(request));
      },
      async keys() {
        return [...entries.keys()].map((url) => new Request(url));
      },
      async delete(request: RequestInfo | URL) {
        return entries.delete(urlOf(request));
      },
    };
  }

  return {
    store,
    async open(name: string) {
      return cacheNamed(name);
    },
    async match(request: RequestInfo | URL, options?: { cacheName?: string }) {
      const url = urlOf(request);
      if (options?.cacheName) return store.get(options.cacheName)?.get(url);
      for (const entries of store.values()) {
        const hit = entries.get(url);
        if (hit) return hit;
      }
      return undefined;
    },
    async keys() {
      return [...store.keys()];
    },
    async delete(name: string) {
      return store.delete(name);
    },
  };
}
