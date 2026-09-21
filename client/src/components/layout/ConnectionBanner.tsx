"use client";

import { useTranslations } from "next-intl";
import { useLiveQuery } from "dexie-react-hooks";
import { CloudUpload, WifiOff } from "lucide-react";

import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { db } from "@/lib/db";

/** Tells the user when they're offline, or when saved-offline changes are still waiting to upload. */
export function ConnectionBanner() {
  const t = useTranslations("States");
  const isOnline = useOnlineStatus();
  const pending = useLiveQuery(() => db.pendingSync.count(), [], 0);

  if (!isOnline) {
    return (
      <p role="status" className="flex items-center gap-3 rounded-3xl border border-white/[0.22] bg-white/5 px-[18px] py-3.5 text-[15px] font-semibold leading-snug">
        <WifiOff aria-hidden="true" size={22} strokeWidth={1.6} className="shrink-0 text-[#a6ff00]" />
        {t("offline")}
      </p>
    );
  }

  if (pending > 0) {
    return (
      <p role="status" className="flex items-center gap-3 rounded-3xl border border-[#a6ff00]/55 bg-[#a6ff00]/[0.06] px-[18px] py-3.5 text-[15px] font-semibold leading-snug">
        <CloudUpload aria-hidden="true" size={22} strokeWidth={1.6} className="shrink-0 text-[#a6ff00]" />
        {t("pendingSync", { count: pending })}
      </p>
    );
  }

  return null;
}
