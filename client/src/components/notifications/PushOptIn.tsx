"use client";

import { useTranslations } from "next-intl";

import { usePushSubscription } from "@/hooks/usePushSubscription";

export function PushOptIn() {
  const t = useTranslations("Push");
  const { status, busy, subscribe, unsubscribe } = usePushSubscription();

  if (status === "unsupported" || status === "denied") return null;

  return (
    <section className="apex-card rounded-[2rem] p-6 text-white">
      <p className="text-sm font-black uppercase tracking-[0.28em] text-[#a6ff00]">
        {t("eyebrow")}
      </p>

      {status === "needs-install" ? (
        <p className="mt-3 text-sm leading-6 text-white/65">{t("iosHint")}</p>
      ) : status === "subscribed" ? (
        <>
          <p className="mt-3 text-sm leading-6 text-white/65">{t("enabledDescription")}</p>
          <button
            type="button"
            onClick={unsubscribe}
            disabled={busy}
            className="apex-button-outline mt-4 rounded-xl px-4 py-2 text-xs font-black disabled:opacity-60"
          >
            {busy ? t("disabling") : t("disable")}
          </button>
        </>
      ) : (
        <>
          <p className="mt-3 text-sm leading-6 text-white/65">{t("description")}</p>
          <button
            type="button"
            onClick={subscribe}
            disabled={busy}
            className="apex-button mt-4 rounded-xl px-4 py-2 text-xs font-black disabled:opacity-60"
          >
            {busy ? t("enabling") : t("enable")}
          </button>
        </>
      )}
    </section>
  );
}
