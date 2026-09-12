"use client";

import { useCallback, useEffect, useState } from "react";

import { subscribeToPush, unsubscribeFromPush } from "@/lib/api/push";

export type PushStatus =
  | "unsupported" // no SW/PushManager, or no VAPID key configured
  | "denied" // user said no -- never nag again
  | "needs-install" // iOS Safari outside standalone mode: push isn't available there
  | "available" // can subscribe
  | "subscribed";

function urlBase64ToUint8Array(base64Url: string): Uint8Array {
  const padding = "=".repeat((4 - (base64Url.length % 4)) % 4);
  const base64 = (base64Url + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((char) => char.charCodeAt(0)));
}

function isIOSOutsideStandalone(): boolean {
  const nav = window.navigator as Navigator & { standalone?: boolean };
  const isStandalone =
    window.matchMedia("(display-mode: standalone)").matches || nav.standalone === true;
  const isIOS = /iphone|ipad|ipod/i.test(nav.userAgent);
  return isIOS && !isStandalone;
}

/**
 * Drives the push opt-in: reports current status, subscribes/unsubscribes,
 * and re-syncs with the backend when the browser rotates the subscription
 * under us (see `pushsubscriptionchange` in public/sw.js).
 */
export function usePushSubscription() {
  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const [status, setStatus] = useState<PushStatus>("unsupported");
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    if (typeof window === "undefined") return;
    const supported = "serviceWorker" in navigator && "PushManager" in window && Boolean(vapidKey);
    if (!supported) {
      setStatus("unsupported");
      return;
    }
    if (Notification.permission === "denied") {
      setStatus("denied");
      return;
    }
    if (isIOSOutsideStandalone()) {
      setStatus("needs-install");
      return;
    }
    try {
      const registration = await navigator.serviceWorker.ready;
      const existing = await registration.pushManager.getSubscription();
      setStatus(existing ? "subscribed" : "available");
    } catch {
      setStatus("unsupported");
    }
  }, [vapidKey]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // The SW asks pushManager to resubscribe on its own when the browser
  // invalidates the old subscription; it posts the result back here so the
  // backend record follows along instead of silently going stale.
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    // Captured once here rather than re-read from the global in the cleanup
    // function below, so a container swapped out between mount and unmount
    // (only really happens in tests) can't make the cleanup crash.
    const container = navigator.serviceWorker;

    const onMessage = (event: MessageEvent) => {
      if (event.data?.type !== "push-subscription-changed") return;
      const { oldEndpoint, subscription } = event.data as {
        oldEndpoint?: string;
        subscription: PushSubscriptionJSON;
      };
      void (async () => {
        try {
          await subscribeToPush(subscription);
          if (oldEndpoint && oldEndpoint !== subscription.endpoint) {
            await unsubscribeFromPush(oldEndpoint);
          }
        } catch {
          /* best-effort; the next foreground refresh() will reconcile */
        }
      })();
    };

    container.addEventListener("message", onMessage);
    return () => container.removeEventListener("message", onMessage);
  }, []);

  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!vapidKey) return false;
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus("denied");
        return false;
      }
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        // TS's DOM lib wants a plain ArrayBuffer-backed BufferSource; the
        // Push API only ever reads these bytes, so the cast is safe.
        applicationServerKey: urlBase64ToUint8Array(vapidKey) as BufferSource,
      });
      await subscribeToPush(subscription.toJSON());
      setStatus("subscribed");
      return true;
    } catch {
      return false;
    } finally {
      setBusy(false);
    }
  }, [vapidKey]);

  const unsubscribe = useCallback(async (): Promise<boolean> => {
    setBusy(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        const endpoint = subscription.endpoint;
        await subscription.unsubscribe();
        await unsubscribeFromPush(endpoint);
      }
      setStatus("available");
      return true;
    } catch {
      return false;
    } finally {
      setBusy(false);
    }
  }, []);

  return { status, busy, subscribe, unsubscribe };
}
