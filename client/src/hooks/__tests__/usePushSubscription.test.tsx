import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";

import { usePushSubscription } from "@/hooks/usePushSubscription";

const subscribeToPush = vi.fn();
const unsubscribeFromPush = vi.fn();

vi.mock("@/lib/api/push", () => ({
  subscribeToPush: (sub: unknown) => subscribeToPush(sub),
  unsubscribeFromPush: (endpoint: string) => unsubscribeFromPush(endpoint),
}));

const VAPID_KEY = "BC2d9ARVYy7jGazk15HxXEx82IZvuPSznAxXsbORgap7AxvO5JpQTipQTH0HqEWzXZGP_WwwFOi6OVbRZl-rtf4";

function stubMatchMedia(standalone: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockImplementation((query: string) => ({
      matches: query.includes("standalone") ? standalone : false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
}

function stubServiceWorker(getSubscription: () => Promise<unknown>, subscribe?: () => Promise<unknown>) {
  const registration = {
    pushManager: {
      getSubscription,
      subscribe: subscribe ?? vi.fn(),
    },
  };
  vi.stubGlobal("navigator", {
    ...window.navigator,
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
    serviceWorker: {
      ready: Promise.resolve(registration),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    },
  });
  return registration;
}

beforeEach(() => {
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = VAPID_KEY;
  vi.stubGlobal("PushManager", function PushManager() {});
  vi.stubGlobal("Notification", { permission: "default", requestPermission: vi.fn() });
  stubMatchMedia(false);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  subscribeToPush.mockReset();
  unsubscribeFromPush.mockReset();
});

describe("usePushSubscription", () => {
  it("is unsupported without a VAPID key", async () => {
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = "";
    stubServiceWorker(() => Promise.resolve(null));

    const { result } = renderHook(() => usePushSubscription());
    await waitFor(() => expect(result.current.status).toBe("unsupported"));
  });

  it("is denied when Notification.permission is denied", async () => {
    vi.stubGlobal("Notification", { permission: "denied", requestPermission: vi.fn() });
    stubServiceWorker(() => Promise.resolve(null));

    const { result } = renderHook(() => usePushSubscription());
    await waitFor(() => expect(result.current.status).toBe("denied"));
  });

  it("needs-install on iOS outside standalone mode", async () => {
    stubMatchMedia(false);
    vi.stubGlobal("navigator", {
      ...window.navigator,
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
      serviceWorker: {
        ready: Promise.resolve({ pushManager: { getSubscription: vi.fn() } }),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      },
    });

    const { result } = renderHook(() => usePushSubscription());
    await waitFor(() => expect(result.current.status).toBe("needs-install"));
  });

  it("is available when there is no existing subscription", async () => {
    stubServiceWorker(() => Promise.resolve(null));

    const { result } = renderHook(() => usePushSubscription());
    await waitFor(() => expect(result.current.status).toBe("available"));
  });

  it("is subscribed when a subscription already exists", async () => {
    stubServiceWorker(() => Promise.resolve({ endpoint: "https://push.example/existing" }));

    const { result } = renderHook(() => usePushSubscription());
    await waitFor(() => expect(result.current.status).toBe("subscribed"));
  });

  it("subscribe() requests permission, subscribes, and posts the subscription", async () => {
    const fakeSubscription = {
      endpoint: "https://push.example/new",
      toJSON: () => ({ endpoint: "https://push.example/new", keys: { p256dh: "a", auth: "b" } }),
    };
    stubServiceWorker(
      () => Promise.resolve(null),
      () => Promise.resolve(fakeSubscription),
    );
    vi.stubGlobal("Notification", {
      permission: "default",
      requestPermission: vi.fn().mockResolvedValue("granted"),
    });

    const { result } = renderHook(() => usePushSubscription());
    await waitFor(() => expect(result.current.status).toBe("available"));

    await act(async () => {
      await result.current.subscribe();
    });

    expect(subscribeToPush).toHaveBeenCalledWith({
      endpoint: "https://push.example/new",
      keys: { p256dh: "a", auth: "b" },
    });
    expect(result.current.status).toBe("subscribed");
  });

  it("subscribe() moves to denied when permission is refused", async () => {
    stubServiceWorker(() => Promise.resolve(null));
    vi.stubGlobal("Notification", {
      permission: "default",
      requestPermission: vi.fn().mockResolvedValue("denied"),
    });

    const { result } = renderHook(() => usePushSubscription());
    await waitFor(() => expect(result.current.status).toBe("available"));

    await act(async () => {
      const ok = await result.current.subscribe();
      expect(ok).toBe(false);
    });

    expect(result.current.status).toBe("denied");
    expect(subscribeToPush).not.toHaveBeenCalled();
  });

  it("unsubscribe() removes the subscription both locally and on the backend", async () => {
    const fakeSubscription = {
      endpoint: "https://push.example/existing",
      unsubscribe: vi.fn().mockResolvedValue(true),
    };
    stubServiceWorker(() => Promise.resolve(fakeSubscription));

    const { result } = renderHook(() => usePushSubscription());
    await waitFor(() => expect(result.current.status).toBe("subscribed"));

    await act(async () => {
      await result.current.unsubscribe();
    });

    expect(fakeSubscription.unsubscribe).toHaveBeenCalled();
    expect(unsubscribeFromPush).toHaveBeenCalledWith("https://push.example/existing");
    expect(result.current.status).toBe("available");
  });
});
