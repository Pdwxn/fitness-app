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
        className="apex-button-outline flex h-12 flex-1 items-center justify-center gap-2 rounded-3xl px-5 text-base font-bold sm:flex-none"
      >
        <Repeat aria-hidden="true" size={20} strokeWidth={1.6} />
        {t("cta")}
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="apex-card w-full max-w-sm rounded-[1.5rem] p-6 text-white">
            <h3 className="text-lg font-black">{t("title")}</h3>
            <p className="mt-2 text-sm leading-6 text-white/65">{t("body")}</p>
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={busy}
                className="apex-button-outline flex-1 rounded-xl py-2.5 text-sm font-black"
              >
                {t("cancel")}
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={busy}
                className="apex-button flex-1 rounded-xl py-2.5 text-sm font-black"
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
