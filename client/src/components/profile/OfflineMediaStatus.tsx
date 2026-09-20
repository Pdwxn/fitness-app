"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";

import { useRoutineCache } from "@/hooks/useRoutineCache";
import {
  clearMediaCache,
  collectRoutineMediaUrls,
  getMediaStatus,
  MEDIA_UPDATED_EVENT,
  precacheRoutineMedia,
  type MediaStatus,
  type PrecacheResult,
} from "@/lib/mediaCache";

/** Profile card: how much of the routine's media is stored for offline use, with manual controls. */
export function OfflineMediaStatus() {
  const t = useTranslations("OfflineMedia");
  const { routine } = useRoutineCache();
  const urls = useMemo(() => (routine ? collectRoutineMediaUrls(routine) : []), [routine]);
  const [status, setStatus] = useState<MediaStatus | null>(null);
  const [last, setLast] = useState<PrecacheResult | null>(null);
  const [busy, setBusy] = useState(false);
  const supported = typeof caches !== "undefined";

  const refresh = useCallback(async () => {
    setStatus(await getMediaStatus(urls));
  }, [urls]);

  useEffect(() => {
    void refresh();
    window.addEventListener(MEDIA_UPDATED_EVENT, refresh);
    return () => window.removeEventListener(MEDIA_UPDATED_EVENT, refresh);
  }, [refresh]);

  if (!routine || urls.length === 0) return null;

  async function download() {
    if (!routine) return;
    setBusy(true);
    try {
      setLast(await precacheRoutineMedia(routine, { force: true }));
    } finally {
      setBusy(false);
      void refresh();
    }
  }

  async function clear() {
    setBusy(true);
    try {
      await clearMediaCache();
      setLast(null);
    } finally {
      setBusy(false);
      void refresh();
    }
  }

  const complete = status !== null && status.total > 0 && status.cached === status.total;
  const note = !supported
    ? t("unsupported")
    : last?.skipped === "offline"
      ? t("offline")
      : last?.failed
        ? t("failed", { failed: last.failed })
        : null;

  return (
    <section className="apex-card rounded-[2rem] p-6 text-white">
      <h3 className="text-lg font-black tracking-tight">{t("title")}</h3>
      <p className="mt-2 text-sm leading-6 text-white/60">{t("description")}</p>

      {status ? (
        <p className="mt-4 text-sm font-bold text-[#d7ff8a]">
          {complete ? t("complete") : t("status", { cached: status.cached, total: status.total })}
        </p>
      ) : null}
      {note ? (
        <p role="status" className="mt-2 text-xs font-bold text-amber-200">
          {note}
        </p>
      ) : null}

      {supported ? (
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={download}
            disabled={busy}
            className="apex-button rounded-xl px-5 py-2.5 text-sm font-black disabled:opacity-60"
          >
            {busy ? t("downloading") : t("download")}
          </button>
          {status && status.cached > 0 ? (
            <button
              type="button"
              onClick={clear}
              disabled={busy}
              className="apex-button-outline rounded-xl px-5 py-2.5 text-sm font-black disabled:opacity-60"
            >
              {t("clear")}
            </button>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
