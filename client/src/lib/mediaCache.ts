import type { Routine } from "@/types/routine";

/**
 * Offline copies of the active routine's exercise photos and demo gifs.
 *
 * Only the routine's own media is stored (~30 exercises, a few MB), never the
 * whole catalog (~125 MB of gifs). Files are fetched with CORS (jsDelivr
 * allows it), so they're stored as normal responses instead of opaque ones
 * that count for far more than their size against the storage quota. The
 * service worker (public/sw.js) serves them from this cache.
 */
export const MEDIA_CACHE_NAME = "apex-fit-media-v1";
export const MEDIA_UPDATED_EVENT = "apex:media-cache-updated";

const CONCURRENCY = 3;

export type MediaStatus = { total: number; cached: number };
export type PrecacheResult = MediaStatus & {
  failed: number;
  skipped?: "unsupported" | "offline" | "save-data";
};

function cacheSupported(): boolean {
  return typeof caches !== "undefined";
}

/** Every distinct http(s) photo/gif URL used by the routine. */
export function collectRoutineMediaUrls(routine: Routine): string[] {
  const urls = new Set<string>();
  for (const week of routine.weeks) {
    for (const day of week.days) {
      for (const exercise of day.exercises) {
        for (const url of [exercise.image_url, exercise.video_url]) {
          if (url && /^https?:\/\//.test(url)) urls.add(url);
        }
      }
    }
  }
  return [...urls];
}

function notifyUpdated() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(MEDIA_UPDATED_EVENT));
}

async function cachedUrls(): Promise<Set<string>> {
  if (!cacheSupported()) return new Set();
  const cache = await caches.open(MEDIA_CACHE_NAME);
  return new Set((await cache.keys()).map((request) => request.url));
}

export async function getMediaStatus(urls: string[]): Promise<MediaStatus> {
  const stored = await cachedUrls().catch(() => new Set<string>());
  return { total: urls.length, cached: urls.filter((url) => stored.has(url)).length };
}

async function runPool<T>(items: T[], limit: number, worker: (item: T) => Promise<void>) {
  const queue = [...items];
  const runners = Array.from({ length: Math.min(limit, queue.length) }, async () => {
    for (let item = queue.shift(); item !== undefined; item = queue.shift()) {
      await worker(item);
    }
  });
  await Promise.all(runners);
}

let inFlight: Promise<PrecacheResult> | null = null;
let lastCompleteSignature: string | null = null;

/**
 * Downloads whatever the routine needs that isn't stored yet and removes
 * files it no longer uses. Safe to call often: concurrent calls share one
 * run, and an unchanged, fully downloaded routine is a no-op.
 */
export function precacheRoutineMedia(
  routine: Routine,
  options: { force?: boolean } = {},
): Promise<PrecacheResult> {
  const urls = collectRoutineMediaUrls(routine);
  const signature = [...urls].sort().join("|");

  if (!options.force && signature === lastCompleteSignature) {
    return getMediaStatus(urls).then((status) => ({ ...status, failed: 0 }));
  }
  if (inFlight) return inFlight;

  inFlight = run(urls, signature, Boolean(options.force)).finally(() => {
    inFlight = null;
  });
  return inFlight;
}

async function run(urls: string[], signature: string, force: boolean): Promise<PrecacheResult> {
  const empty = { total: urls.length, cached: 0, failed: 0 };
  if (!cacheSupported()) return { ...empty, skipped: "unsupported" };
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return { ...empty, skipped: "offline" };
  }
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  if (!force && connection?.saveData) return { ...empty, skipped: "save-data" };

  const cache = await caches.open(MEDIA_CACHE_NAME);
  const wanted = new Set(urls);
  const stored = new Set((await cache.keys()).map((request) => request.url));

  for (const url of stored) {
    if (!wanted.has(url)) await cache.delete(url);
  }

  let failed = 0;
  await runPool(
    urls.filter((url) => !stored.has(url)),
    CONCURRENCY,
    async (url) => {
      try {
        const response = await fetch(url, { mode: "cors", credentials: "omit" });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        await cache.put(url, response);
      } catch {
        failed += 1;
      }
    },
  );

  const status = await getMediaStatus(urls);
  // Only remember a fully downloaded routine: a partial one is retried next time.
  lastCompleteSignature = failed === 0 ? signature : null;
  notifyUpdated();
  return { ...status, failed };
}

export async function clearMediaCache(): Promise<void> {
  if (!cacheSupported()) return;
  await caches.delete(MEDIA_CACHE_NAME);
  lastCompleteSignature = null;
  notifyUpdated();
}

/** Wipes every Cache Storage entry (service worker + media). Used on logout. */
export async function clearAllCaches(): Promise<void> {
  if (!cacheSupported()) return;
  const names = await caches.keys();
  await Promise.all(names.map((name) => caches.delete(name)));
  lastCompleteSignature = null;
}
