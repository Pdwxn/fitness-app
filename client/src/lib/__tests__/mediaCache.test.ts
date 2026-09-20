import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { makeFakeCaches } from "@/test/fakeCaches";
import type { Routine } from "@/types/routine";

const IMG = (n: number) => `https://cdn.example.com/images/${n}.jpg`;
const GIF = (n: number) => `https://cdn.example.com/videos/${n}.gif`;

function routineWith(exercises: { image_url?: string; video_url?: string }[]): Routine {
  return {
    id: "r1",
    weeks: [
      {
        id: "w1",
        days: [
          {
            id: "d1",
            exercises: exercises.map((e, i) => ({
              id: `e${i}`,
              image_url: e.image_url ?? "",
              video_url: e.video_url ?? "",
            })),
          },
        ],
      },
    ],
  } as unknown as Routine;
}

type MediaModule = typeof import("@/lib/mediaCache");
let media: MediaModule;
let fakeCaches: ReturnType<typeof makeFakeCaches>;
let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(async () => {
  vi.resetModules(); // fresh in-flight / "last complete" state per test
  fakeCaches = makeFakeCaches();
  vi.stubGlobal("caches", fakeCaches);
  fetchMock = vi.fn(async () => new Response("bytes", { status: 200 }));
  vi.stubGlobal("fetch", fetchMock);
  Object.defineProperty(navigator, "onLine", { value: true, configurable: true });
  Object.defineProperty(navigator, "connection", { value: undefined, configurable: true });
  media = await import("@/lib/mediaCache");
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("collectRoutineMediaUrls", () => {
  it("returns each distinct http(s) photo and demo once", () => {
    const routine = routineWith([
      { image_url: IMG(1), video_url: GIF(1) },
      { image_url: IMG(1), video_url: GIF(2) },
      { image_url: "", video_url: "" },
      { image_url: "data:image/png;base64,xx", video_url: "javascript:alert(1)" },
    ]);
    expect(media.collectRoutineMediaUrls(routine).sort()).toEqual([IMG(1), GIF(1), GIF(2)].sort());
  });
});

describe("precacheRoutineMedia", () => {
  it("downloads everything with CORS and no credentials, then reports it", async () => {
    const routine = routineWith([{ image_url: IMG(1), video_url: GIF(1) }]);

    const result = await media.precacheRoutineMedia(routine);

    expect(result).toMatchObject({ total: 2, cached: 2, failed: 0 });
    for (const call of fetchMock.mock.calls) {
      expect(call[1]).toEqual({ mode: "cors", credentials: "omit" });
    }
    expect([...fakeCaches.store.get(media.MEDIA_CACHE_NAME)!.keys()].sort()).toEqual(
      [IMG(1), GIF(1)].sort(),
    );
  });

  it("only downloads what is missing", async () => {
    const cache = await fakeCaches.open(media.MEDIA_CACHE_NAME);
    await cache.put(IMG(1), new Response("x"));

    await media.precacheRoutineMedia(routineWith([{ image_url: IMG(1), video_url: GIF(1) }]));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe(GIF(1));
  });

  it("removes files the routine no longer uses", async () => {
    const cache = await fakeCaches.open(media.MEDIA_CACHE_NAME);
    await cache.put(IMG(99), new Response("old"));

    await media.precacheRoutineMedia(routineWith([{ image_url: IMG(1) }]));

    expect([...fakeCaches.store.get(media.MEDIA_CACHE_NAME)!.keys()]).toEqual([IMG(1)]);
  });

  it("never runs more than 3 downloads at once", async () => {
    let active = 0;
    let peak = 0;
    fetchMock.mockImplementation(async () => {
      active += 1;
      peak = Math.max(peak, active);
      await new Promise((resolve) => setTimeout(resolve, 5));
      active -= 1;
      return new Response("x");
    });

    await media.precacheRoutineMedia(
      routineWith(Array.from({ length: 12 }, (_, i) => ({ image_url: IMG(i) }))),
    );

    expect(peak).toBe(3);
    expect(fetchMock).toHaveBeenCalledTimes(12);
  });

  it("counts failures, keeps the rest, and retries them next time", async () => {
    fetchMock.mockImplementation(async (url: string) =>
      url === GIF(1) ? new Response("nope", { status: 404 }) : new Response("ok"),
    );
    const routine = routineWith([{ image_url: IMG(1), video_url: GIF(1) }]);

    const first = await media.precacheRoutineMedia(routine);
    expect(first).toMatchObject({ total: 2, cached: 1, failed: 1 });

    fetchMock.mockClear();
    fetchMock.mockImplementation(async () => new Response("ok"));
    const second = await media.precacheRoutineMedia(routine);
    expect(second).toMatchObject({ cached: 2, failed: 0 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("a network error is a failure, not an exception", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));
    const result = await media.precacheRoutineMedia(routineWith([{ image_url: IMG(1) }]));
    expect(result).toMatchObject({ cached: 0, failed: 1 });
  });

  it("is a no-op the second time for an unchanged, fully downloaded routine", async () => {
    const routine = routineWith([{ image_url: IMG(1) }]);
    await media.precacheRoutineMedia(routine);
    fetchMock.mockClear();

    const again = await media.precacheRoutineMedia(routine);

    expect(again).toMatchObject({ cached: 1, failed: 0 });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("concurrent calls share one run", async () => {
    const routine = routineWith([{ image_url: IMG(1) }, { image_url: IMG(2) }]);
    await Promise.all([media.precacheRoutineMedia(routine), media.precacheRoutineMedia(routine)]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does nothing offline", async () => {
    Object.defineProperty(navigator, "onLine", { value: false, configurable: true });
    const result = await media.precacheRoutineMedia(routineWith([{ image_url: IMG(1) }]));
    expect(result.skipped).toBe("offline");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("respects data saver unless forced", async () => {
    Object.defineProperty(navigator, "connection", { value: { saveData: true }, configurable: true });
    const routine = routineWith([{ image_url: IMG(1) }]);

    expect((await media.precacheRoutineMedia(routine)).skipped).toBe("save-data");
    expect(fetchMock).not.toHaveBeenCalled();

    expect(await media.precacheRoutineMedia(routine, { force: true })).toMatchObject({ cached: 1 });
  });

  it("does nothing where the Cache API is unavailable", async () => {
    vi.stubGlobal("caches", undefined);
    const result = await media.precacheRoutineMedia(routineWith([{ image_url: IMG(1) }]));
    expect(result.skipped).toBe("unsupported");
  });

  it("announces updates so the UI can refresh", async () => {
    const listener = vi.fn();
    window.addEventListener(media.MEDIA_UPDATED_EVENT, listener);
    await media.precacheRoutineMedia(routineWith([{ image_url: IMG(1) }]));
    window.removeEventListener(media.MEDIA_UPDATED_EVENT, listener);
    expect(listener).toHaveBeenCalled();
  });
});

describe("clearing", () => {
  it("clearMediaCache removes only the media cache", async () => {
    await (await fakeCaches.open(media.MEDIA_CACHE_NAME)).put(IMG(1), new Response("x"));
    await (await fakeCaches.open("apex-fit-v2")).put("https://app.test/a", new Response("x"));

    await media.clearMediaCache();

    expect([...fakeCaches.store.keys()]).toEqual(["apex-fit-v2"]);
  });

  it("clearAllCaches removes everything (used on logout)", async () => {
    await (await fakeCaches.open(media.MEDIA_CACHE_NAME)).put(IMG(1), new Response("x"));
    await (await fakeCaches.open("apex-fit-v2")).put("https://app.test/api/v1/profile/", new Response("x"));

    await media.clearAllCaches();

    expect(fakeCaches.store.size).toBe(0);
  });

  it("clearing is safe without the Cache API", async () => {
    vi.stubGlobal("caches", undefined);
    await expect(media.clearAllCaches()).resolves.toBeUndefined();
    await expect(media.clearMediaCache()).resolves.toBeUndefined();
  });
});
