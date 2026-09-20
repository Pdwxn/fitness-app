"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { StatusCard } from "@/components/ui/StatusCard";
import { usePendingProposal } from "@/hooks/usePendingProposal";
import { ApiError } from "@/lib/api/authenticated-client";
import { approveProposal, rejectProposal } from "@/lib/api/coach";
import { db } from "@/lib/db";
import { queryClient } from "@/lib/query-client";
import { queryKeys } from "@/lib/query-keys";
import { useNextRoutineStore } from "@/store/nextRoutineStore";
import type { Routine } from "@/types/routine";

import { CoachChangeCard } from "./CoachChangeCard";

type Decision = "approve" | "reject";

export function CoachReviewContent({ locale }: { locale: string }) {
  const t = useTranslations("Coach");
  const router = useRouter();
  const { proposal, isLoading, isError } = usePendingProposal();
  const [busy, setBusy] = useState<Decision | null>(null);

  async function decide(decision: Decision) {
    if (!proposal) return;
    setBusy(decision);
    try {
      const routine: Routine =
        decision === "approve"
          ? await approveProposal(proposal.id)
          : await rejectProposal(proposal.id);

      await db.routineCache.put(routine).catch(() => undefined);
      queryClient.setQueryData(queryKeys.routine.active(), routine);
      queryClient.setQueryData(queryKeys.proposal.pending(), null);
      void queryClient.invalidateQueries({ queryKey: queryKeys.routine.active() });
      useNextRoutineStore.getState().clearNextProposal();

      toast.success(t(decision === "approve" ? "approved" : "rejected"));
      router.push(`/${locale}/dashboard`);
    } catch (error) {
      const offline = typeof navigator !== "undefined" && !navigator.onLine;
      const stale = error instanceof ApiError && error.status === 409;
      toast.error(offline ? t("errors.offline") : stale ? t("errors.conflict") : t("errors.generic"));
      setBusy(null);
    }
  }

  if (isLoading) return <StatusCard message={t("states.loading")} />;
  if (isError) return <StatusCard message={t("states.error")} tone="error" />;

  if (!proposal) {
    return (
      <div className="flex flex-col gap-4">
        <StatusCard message={t("states.empty")} />
        <Link
          href={`/${locale}/dashboard`}
          className="w-fit text-sm font-black text-[#a6ff00] hover:text-white"
        >
          {t("backToDashboard")}
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 text-white">
      <section className="apex-card rounded-[2rem] p-6">
        <p className="text-xs font-black uppercase tracking-[0.28em] text-[#a6ff00]">{t("eyebrow")}</p>
        {proposal.summary ? (
          <>
            <p className="mt-3 text-xs font-black uppercase tracking-[0.14em] text-white/50">
              {t("summaryLabel")}
            </p>
            <p className="mt-1 text-base leading-7 text-white/80">{proposal.summary}</p>
          </>
        ) : null}
        <p className="mt-3 text-sm font-bold text-white/50">
          {t("changeCount", { count: proposal.changes.length })}
        </p>
      </section>

      <div className="grid gap-3">
        {proposal.changes.map((change, index) => (
          <CoachChangeCard key={`${change.type}-${index}`} change={change} />
        ))}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={() => decide("approve")}
          disabled={busy !== null}
          className="apex-button flex-1 rounded-2xl py-3 text-base font-black disabled:opacity-60"
        >
          {busy === "approve" ? t("approving") : t("approve")}
        </button>
        <button
          type="button"
          onClick={() => decide("reject")}
          disabled={busy !== null}
          className="apex-button-outline flex-1 rounded-2xl py-3 text-base font-black disabled:opacity-60"
        >
          {busy === "reject" ? t("rejecting") : t("reject")}
        </button>
      </div>
      <p className="text-center text-xs font-bold text-white/40">{t("rejectHint")}</p>
    </div>
  );
}
