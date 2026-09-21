import { readFileSync } from "node:fs";
import { join } from "node:path";

import { beforeEach, describe, expect, it, vi } from "vitest";

import { makeFakeCaches } from "@/test/fakeCaches";

/**
 * Runs the real public/sw.js against stubbed `self` / `caches` / `fetch` and
 * drives its `fetch` and `activate` events -- the worker is plain JS the
 * browser runs on its own, so this is the only place its caching rules are checked.
 */
const SOURCE = readFileSync(join(process.cwd(), "public", "sw.js"), "utf8");

type Listener = (event: unknown) => void;

function loadWorker(
  networkFetch: (request: Request) => Promise<Response>,
  source: string = SOURCE,
) {
  const listeners = new Map<string, Listener>();
  const fakeCaches = makeFakeCaches();
  const self = { addEventListener: (type: string, fn: Listener) => listeners.set(type, fn) };
  new Function("self", "caches", "fetch", source)(self, fakeCaches, networkFetch);

  async function dispatchFetch(request: Request) {
    const waits: Promise<unknown>[] = [];
    let responded: Promise<Response> | undefined;
    listeners.get("fetch")!({
      request,
      respondWith: (p: Promise<Response>) => {
        responded = p;
      },
      waitUntil: (p: Promise<unknown>) => waits.push(p),
    });
    const response = responded ? await responded : undefined;
    await Promise.all(waits);
    return { handled: responded !== undefined, response };
  }

  async function activate() {
    const waits: Promise<unknown>[] = [];
    listeners.get("activate")!({ waitUntil: (p: Promise<unknown>) => waits.push(p) });
    await Promise.all(waits);
  }

  return { fakeCaches, dispatchFetch, activate };
}

const API = "https://api.example.com/api/v1/routines/active/";
const IMG = "https://cdn.jsdelivr.net/gh/x/y@abc/images/1.jpg";

let network: ReturnType<typeof vi.fn<(request: Request) => Promise<Response>>>;

beforeEach(() => {
  network = vi.fn<(request: Request) => Promise<Response>>(async () => new Response("live", { status: 200 }));
});

describe("service worker", () => {
  it("never touches writes", async () => {
    const { dispatchFetch } = loadWorker(network);
    const { handled } = await dispatchFetch(new Request(API, { method: "POST", body: "{}" }));
    expect(handled).toBe(false);
  });

  it("serves the network response first and keeps a copy of successful reads", async () => {
    const { dispatchFetch, fakeCaches } = loadWorker(network);

    const { response } = await dispatchFetch(new Request(API));

    expect(await response!.text()).toBe("live");
    expect(await (await fakeCaches.open("apex-fit-v2")).match(API)).toBeDefined();
  });

  it("falls back to the last good copy when the network fails", async () => {
    const { dispatchFetch } = loadWorker(network);
    await dispatchFetch(new Request(API));

    network.mockRejectedValue(new TypeError("offline"));
    const { response } = await dispatchFetch(new Request(API));

    expect(await response!.text()).toBe("live");
  });

  it("does not store error responses (a 500 must not replace a good copy)", async () => {
    const { dispatchFetch, fakeCaches } = loadWorker(network);
    network.mockResolvedValue(new Response("boom", { status: 500 }));

    await dispatchFetch(new Request(API));

    expect(await (await fakeCaches.open("apex-fit-v2")).match(API)).toBeUndefined();
  });

  it("fails cleanly (network error) when offline with nothing stored", async () => {
    const { dispatchFetch } = loadWorker(network);
    network.mockRejectedValue(new TypeError("offline"));

    const { response } = await dispatchFetch(new Request(API));

    expect(response!.type).toBe("error");
  });

  it("serves exercise media from the media cache, never from the API cache", async () => {
    const { dispatchFetch, fakeCaches } = loadWorker(network);
    await (await fakeCaches.open("apex-fit-media-v1")).put(IMG, new Response("stored-photo"));

    const { response } = await dispatchFetch(new Request(IMG));

    expect(await response!.text()).toBe("stored-photo");
    expect(network).not.toHaveBeenCalled();
  });

  it("does not opportunistically cache media it fetched from the network", async () => {
    const { dispatchFetch, fakeCaches } = loadWorker(network);

    await dispatchFetch(new Request(IMG));

    expect(network).toHaveBeenCalledTimes(1);
    expect(fakeCaches.store.size).toBe(0);
  });

  it("serves static assets cache-first", async () => {
    const { dispatchFetch, fakeCaches } = loadWorker(network);
    const asset = "https://app.example.com/_next/static/chunks/main.js";
    await (await fakeCaches.open("apex-fit-v2")).put(asset, new Response("cached-js"));

    const { response } = await dispatchFetch(new Request(asset));

    expect(await response!.text()).toBe("cached-js");
    expect(network).not.toHaveBeenCalled();
  });

  it("with CACHE_API_RESPONSES off (the future Dexie-only mode) API reads go straight to the network", async () => {
    const source = SOURCE.replace("const CACHE_API_RESPONSES = true;", "const CACHE_API_RESPONSES = false;");
    expect(source).not.toBe(SOURCE);
    const { dispatchFetch, fakeCaches } = loadWorker(network, source);

    const api = await dispatchFetch(new Request(API));
    const page = await dispatchFetch(new Request("https://app.example.com/es/dashboard"));

    expect(api.handled).toBe(false); // the browser's own network stack, nothing stored
    expect(page.handled).toBe(true); // pages still get the offline fallback
    expect(await (await fakeCaches.open("apex-fit-v2")).match(API)).toBeUndefined();
  });

  it("on activation deletes old cache versions but keeps the current and the media cache", async () => {
    const { activate, fakeCaches } = loadWorker(network);
    for (const name of ["apex-fit-v1", "apex-fit-v2", "apex-fit-media-v1", "something-else"]) {
      await fakeCaches.open(name);
    }

    await activate();

    expect([...fakeCaches.store.keys()].sort()).toEqual(["apex-fit-media-v1", "apex-fit-v2"]);
  });
});
