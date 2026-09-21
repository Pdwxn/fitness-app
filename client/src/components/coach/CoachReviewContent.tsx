"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { AlertCircle, Check, CheckCircle2, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { StatusCard } from "@/components/ui/StatusCard";
import { AthleteSilhouette } from "@/components/ui/AthleteSilhouette";
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

function Skeleton({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-xl bg-white/[0.09] ${className}`} />;
}

export function CoachReviewContent({ locale }: { locale: string }) {
  const t = useTranslations("Coach");
  const router = useRouter();
  const { proposal, isLoading, isError } = usePendingProposal();
  const [busy, setBusy] = useState<Decision | null>(null);
  const [conflict, setConflict] = useState(false);

  async function decide(decision: Decision) {
    if (!proposal) return;
    setBusy(decision);
    setConflict(false);
    try {
      const routine: Routine =
        decision === "approve" ? await approveProposal(proposal.id) : await rejectProposal(proposal.id);

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
      if (stale) setConflict(true);
      else toast.error(offline ? t("errors.offline") : t("errors.generic"));
      setBusy(null);
    }
  }

  const title = <h1 className="text-[40px] font-black leading-none tracking-tight">{t("reviewTitle")}</h1>;

  if (isLoading) {
    return (
      <div className="flex flex-col gap-5">
        {title}
        <div role="status" aria-live="polite" className="flex flex-col gap-4 border-t border-white/[0.13] pt-6">
          <p className="flex items-center gap-2.5 text-base font-bold text-[#a6ff00]">
            <Loader2 aria-hidden="true" size={22} strokeWidth={2.2} className="animate-spin" />
            {t("states.loading")}
          </p>
          <Skeleton className="h-6 w-3/5" />
          <Skeleton className="h-3.5 w-full" />
          <Skeleton className="h-3.5 w-[85%]" />
        </div>
        {[0, 1, 2].map((item) => (
          <div key={item} aria-hidden="true" className="flex flex-col gap-3.5 border-t border-white/[0.13] pt-5">
            <Skeleton className="h-8 w-[45%] rounded-full" />
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-3.5 w-full" />
          </div>
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col gap-5">
        {title}
        <StatusCard message={t("states.error")} tone="error" />
      </div>
    );
  }

  if (!proposal) {
    return (
      <div className="flex flex-col gap-5">
        {title}
        <div role="status" className="flex flex-col items-start gap-5 border-t border-white/[0.13] pt-7">
          <span className="grid size-[72px] place-items-center rounded-full border-[1.5px] border-[#a6ff00]/55 bg-[#a6ff00]/[0.08] text-[#a6ff00]">
            <CheckCircle2 aria-hidden="true" size={34} strokeWidth={1.5} />
          </span>
          <div className="flex flex-col gap-2">
            <p className="text-[28px] font-black leading-tight tracking-tight">{t("states.emptyTitle")}</p>
            <p className="text-lg leading-snug text-white/60">{t("states.empty")}</p>
          </div>
        </div>
        <Link
          href={`/${locale}/routine`}
          className="flex h-[58px] items-center justify-center rounded-[29px] border-[1.5px] border-white/30 px-7 text-lg font-bold"
        >
          {t("backToRoutine")}
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 text-white">
      {title}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)] lg:items-start lg:gap-8">
        <section
          aria-label={t("summaryLabel")}
          className="relative overflow-hidden lg:col-start-1 lg:row-start-1 rounded-[2rem] border border-white/[0.13] bg-white/[0.065] p-6"
        >
          <div className="pointer-events-none absolute -top-[90px] left-[120px] size-60 rounded-full bg-[radial-gradient(circle,rgba(166,255,0,0.4)_0%,transparent_68%)] blur-[40px]" />
          <AthleteSilhouette className="pointer-events-none absolute -bottom-6 -right-4 hidden h-52 w-auto opacity-60 md:block" />
          <div className="relative flex flex-col gap-3.5">
            <p className="text-[13px] font-bold uppercase tracking-[0.22em] text-[#a6ff00]">{t("eyebrow")}</p>
            <h2 className="text-[28px] font-black leading-[1.05] tracking-tight">{t("summaryLabel")}</h2>
            {proposal.summary ? (
              <p className="text-[17px] font-medium leading-relaxed text-white/60">{proposal.summary}</p>
            ) : null}
            <span className="flex w-fit items-center gap-2.5 rounded-3xl bg-[#a6ff00] px-4 py-2.5 text-[17px] font-extrabold text-black">
              <Sparkles aria-hidden="true" size={20} strokeWidth={2} />
              {t("changeCount", { count: proposal.changes.length })}
            </span>
          </div>
        </section>

        <div className="grid gap-4 lg:col-start-2 lg:row-span-3 lg:row-start-1">
          {proposal.changes.map((change, index) => (
            <CoachChangeCard key={`${change.type}-${index}`} change={change} />
          ))}
        </div>

        {conflict ? (
          <div
            role="alert"
            className="lg:col-start-1 flex items-start gap-3 rounded-3xl border border-red-400/55 bg-red-400/[0.08] px-[18px] py-4"
          >
            <AlertCircle aria-hidden="true" size={24} strokeWidth={1.8} className="mt-0.5 shrink-0 text-red-400" />
            <p className="text-base font-semibold leading-snug">{t("errors.conflict")}</p>
          </div>
        ) : null}

        <div className="flex flex-col gap-3 md:max-w-xl lg:col-start-1 lg:max-w-none">
          <button
            type="button"
            onClick={() => decide("approve")}
            disabled={busy !== null || conflict}
            className="apex-button flex h-[62px] items-center justify-center gap-2.5 rounded-[1.9375rem] text-[19px] font-extrabold disabled:opacity-50"
          >
            <Check aria-hidden="true" size={22} strokeWidth={2.4} />
            {busy === "approve" ? t("approving") : t("approve")}
          </button>
          <button
            type="button"
            onClick={() => decide("reject")}
            disabled={busy !== null}
            className="flex h-[58px] items-center justify-center rounded-[29px] border-[1.5px] border-white/30 text-lg font-bold disabled:opacity-60"
          >
            {busy === "reject" ? t("rejecting") : t("reject")}
          </button>
          <p className="text-center text-[15px] font-medium leading-snug text-white/60">{t("rejectHint")}</p>
        </div>
      </div>
    </div>
  );
}
