"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Repeat } from "lucide-react";
import { toast } from "sonner";

import { deactivateRoutine } from "@/lib/api/routines";
import { db, deleteMeta, META_KEYS } from "@/lib/db";
import { queryClient } from "@/lib/query-client";
import { queryKeys } from "@/lib/query-keys";

type ChangeRoutineButtonProps = {
  routineId: string;
};

export function ChangeRoutineButton({ routineId }: ChangeRoutineButtonProps) {
  const t = useTranslations("RoutineChoice.change");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleConfirm = async () => {
    setBusy(true);
    try {
      await deactivateRoutine(routineId);
      await db.routineCache.clear().catch(() => undefined);
      await deleteMeta(META_KEYS.routineBuilderDraft);
      queryClient.setQueryData(queryKeys.routine.active(), null);
      void queryClient.invalidateQueries({ queryKey: queryKeys.routine.active() });
      setOpen(false);
      router.refresh();
    } catch {
      toast.error(t("error"));
      setBusy(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="apex-button-outline flex h-12 flex-1 items-center justify-center gap-2 rounded-3xl px-3 text-[15px] font-bold sm:flex-none sm:px-5 sm:text-base"
      >
        <Repeat aria-hidden="true" size={20} strokeWidth={1.6} />
        {t("cta")}
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-5 backdrop-blur-sm">
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="change-routine-title"
            aria-describedby="change-routine-body"
            onKeyDown={(event) => {
              if (event.key === "Escape" && !busy) setOpen(false);
            }}
            className="flex w-full max-w-sm flex-col gap-5 rounded-[2rem] border border-white/[0.18] bg-[#111411] p-6 text-white shadow-[0_24px_60px_rgba(0,0,0,0.7)]"
          >
            <div className="flex flex-col gap-2">
              <h3 id="change-routine-title" className="text-2xl font-black leading-tight tracking-tight">
                {t("title")}
              </h3>
              <p id="change-routine-body" className="text-base leading-relaxed text-white/60">
                {t("body")}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                autoFocus
                onClick={() => setOpen(false)}
                disabled={busy}
                className="flex h-[52px] flex-1 items-center justify-center rounded-3xl border-[1.5px] border-white/30 text-base font-bold disabled:opacity-60"
              >
                {t("cancel")}
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={busy}
                className="apex-button flex h-[52px] flex-1 items-center justify-center rounded-3xl text-base font-extrabold disabled:opacity-60"
              >
                {t("confirm")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
