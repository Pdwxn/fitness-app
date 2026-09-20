"use client";

import { useTranslations } from "next-intl";
import { Bell, BellOff, Info, Share, type LucideIcon } from "lucide-react";

import { usePushSubscription } from "@/hooks/usePushSubscription";

export function PushOptIn() {
  const tp = useTranslations("Profile.notifications");
  const { status, busy, subscribe, unsubscribe } = usePushSubscription();

  const enabled = status === "subscribed";
  const canToggle = status === "subscribed" || status === "available";
  const Icon: LucideIcon = canToggle ? Bell : BellOff;

  const statusText =
    status === "subscribed"
      ? tp("enabled")
      : status === "available"
        ? tp("disabled")
        : status === "denied"
          ? tp("blocked")
          : tp("unavailable");

  return (
    <section className="flex flex-col gap-4 border-t border-white/[0.13] pt-6 text-white">
      <h2 className="text-2xl font-black leading-tight tracking-tight">{tp("title")}</h2>

      <div className="flex min-h-16 items-center gap-3.5">
        <span className={`flex ${enabled ? "text-[#a6ff00]" : ""}`}>
          <Icon aria-hidden="true" size={26} strokeWidth={1.6} />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p className="text-[19px] font-extrabold">{tp("reminders")}</p>
          <p className={`text-[15px] leading-snug ${enabled ? "font-bold text-[#a6ff00]" : "font-medium text-white/60"}`}>
            {canToggle && !enabled ? tp("description") : statusText}
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-label={tp("reminders")}
          disabled={!canToggle || busy}
          onClick={enabled ? unsubscribe : subscribe}
          className={`relative h-9 w-16 shrink-0 rounded-full transition-colors ${
            enabled ? "bg-[#a6ff00]" : "bg-white/[0.14]"
          } ${canToggle ? "" : "opacity-45"} ${busy ? "opacity-60" : ""}`}
        >
          <span
            aria-hidden="true"
            className={`absolute top-1 size-7 rounded-full transition-[left] ${
              enabled ? "left-[34px] bg-black" : "left-1 bg-white"
            }`}
          />
        </button>
      </div>

      {status === "denied" ? (
        <p role="status" className="flex gap-3 rounded-[20px] border border-red-400/55 bg-red-400/[0.08] px-4 py-3.5 text-[15px] font-semibold leading-relaxed">
          <Info aria-hidden="true" size={22} strokeWidth={1.8} className="mt-0.5 shrink-0 text-red-400" />
          {tp("blockedHelp")}
        </p>
      ) : null}
      {status === "needs-install" ? (
        <p role="status" className="flex gap-3 rounded-[20px] border border-white/[0.22] bg-white/5 px-4 py-3.5 text-[15px] font-semibold leading-relaxed">
          <Share aria-hidden="true" size={22} strokeWidth={1.8} className="mt-0.5 shrink-0 text-[#a6ff00]" />
          {tp("iosHelp")}
        </p>
      ) : null}
      {status === "unsupported" ? (
        <p role="status" className="text-[15px] font-medium text-white/60">
          {tp("unavailableHelp")}
        </p>
      ) : null}
    </section>
  );
}
