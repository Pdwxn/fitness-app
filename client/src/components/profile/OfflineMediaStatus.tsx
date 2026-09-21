"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { CheckCircle2, Download, Trash2 } from "lucide-react";

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

/** Profile section: how much of the routine's media is stored for offline use, with manual controls. */
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
  const percent = status && status.total > 0 ? Math.round((status.cached / status.total) * 100) : 0;
  const note = !supported
    ? t("unsupported")
    : last?.skipped === "offline"
      ? t("offline")
      : last?.failed
        ? t("failed", { failed: last.failed })
        : null;

  return (
    <section className="flex flex-col gap-4 border-t border-white/[0.13] pt-6 text-white">
      <h2 className="text-2xl font-black leading-tight tracking-tight">{t("title")}</h2>
      <p className="text-base leading-relaxed text-white/60">{t("description")}</p>

      {status ? (
        complete ? (
          <p className="flex items-center gap-3 text-xl font-extrabold text-[#a6ff00]">
            <CheckCircle2 aria-hidden="true" size={30} strokeWidth={1.6} />
            {t("complete")}
          </p>
        ) : (
          <div className="flex flex-col gap-2.5">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-base font-bold">{t("status", { cached: status.cached, total: status.total })}</span>
              <span className="text-lg font-extrabold text-[#a6ff00]">{percent}%</span>
            </div>
            <div
              role="progressbar"
              aria-label={t("title")}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={percent}
              className="h-3 rounded-full bg-white/10"
            >
              <div className="h-full rounded-full bg-[#a6ff00]" style={{ width: `${percent}%` }} />
            </div>
          </div>
        )
      ) : null}
      {note ? (
        <p role="status" className="text-sm font-bold text-amber-200">
          {note}
        </p>
      ) : null}

      {supported ? (
        <div className="flex flex-col gap-3">
          {complete ? null : (
            <button
              type="button"
              onClick={download}
              disabled={busy}
              className="apex-button flex h-14 items-center justify-center gap-2.5 rounded-[28px] text-lg font-extrabold disabled:opacity-60"
            >
              <Download aria-hidden="true" size={22} strokeWidth={1.8} />
              {busy ? t("downloading") : t("download")}
            </button>
          )}
          {status && status.cached > 0 ? (
            <button
              type="button"
              onClick={clear}
              disabled={busy}
              className="flex h-14 items-center justify-center gap-2.5 rounded-[28px] border-[1.5px] border-white/30 text-lg font-bold disabled:opacity-60"
            >
              <Trash2 aria-hidden="true" size={22} strokeWidth={1.8} />
              {t("clear")}
            </button>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
