"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { AlertCircle, ArrowLeft, Minus, Plus, Save, WifiOff } from "lucide-react";
import { toast } from "sonner";

import { queryKeys } from "@/lib/query-keys";
import { queryClient } from "@/lib/query-client";
import { db } from "@/lib/db";
import { createManualRoutine, updateManualRoutine } from "@/lib/api/routines";
import { ApiError } from "@/lib/api/authenticated-client";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { useRoutineCache } from "@/hooks/useRoutineCache";
import {
  queuePendingRoutine,
  useRoutineBuilderStore,
  validateDraft,
} from "@/store/routineBuilderStore";

import { RoutineWeekEditor } from "./RoutineWeekEditor";
import { isBlankDraft, TemplatePicker } from "./TemplatePicker";
import { describeValidationError } from "./validationMessage";

type RoutineBuilderWizardProps = { locale: string; mode?: "create" | "edit" };

export function RoutineBuilderWizard({ locale, mode = "create" }: RoutineBuilderWizardProps) {
  const t = useTranslations("Builder");
  const tv = useTranslations("Builder.validation");
  const router = useRouter();
  const isOnline = useOnlineStatus();

  // Edit mode loads the current active routine; create mode never fetches it.
  const { routine, isLoading: routineLoading } = useRoutineCache();

  const draft = useRoutineBuilderStore((state) => state.draft);
  const hydrated = useRoutineBuilderStore((state) => state.hydrated);
  const hydrate = useRoutineBuilderStore((state) => state.hydrate);
  const startEditing = useRoutineBuilderStore((state) => state.startEditing);
  const editingRoutineId = useRoutineBuilderStore((state) => state.editingRoutineId);
  const addWeek = useRoutineBuilderStore((state) => state.addWeek);
  const removeWeek = useRoutineBuilderStore((state) => state.removeWeek);
  const reset = useRoutineBuilderStore((state) => state.reset);

  const [saving, setSaving] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [editUnavailable, setEditUnavailable] = useState(false);
  const [selectedWeekIndex, setSelectedWeekIndex] = useState(0);

  useEffect(() => {
    if (mode !== "edit") {
      void hydrate();
      return;
    }
    if (routineLoading) return;
    if (routine && routine.source === "manual") {
      startEditing(routine);
    } else {
      // Nothing to edit (no active routine, or it's AI-generated): bounce back.
      setEditUnavailable(true);
    }
  }, [mode, routine, routineLoading, hydrate, startEditing]);

  useEffect(() => {
    if (editUnavailable) {
      router.replace(`/${locale}/dashboard`);
    }
  }, [editUnavailable, locale, router]);

  const errors = useMemo(() => validateDraft(draft), [draft]);
  const isEditing = mode === "edit" && Boolean(editingRoutineId);
  const isLoadingState = editUnavailable || !hydrated || (mode === "edit" && routineLoading);

  const weekIndex = Math.min(selectedWeekIndex, draft.weeks.length - 1);
  const week = draft.weeks[weekIndex];
  const weekErrors = errors.filter((error) => error.weekNumber === week?.week_number);

  if (isLoadingState) {
    return <p className="p-4 text-sm text-white/60">{t("states.loading")}</p>;
  }

  const goToDashboard = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.routine.active() });
    router.push(`/${locale}/dashboard`);
    router.refresh();
  };

  const handleSaveEdit = async () => {
    if (!editingRoutineId) return;
    setSaving(true);
    try {
      if (typeof navigator !== "undefined" && navigator.onLine === false) {
        throw new Error("offline");
      }
      const updated = await updateManualRoutine(editingRoutineId, draft);
      await db.routineCache.put(updated);
      queryClient.setQueryData(queryKeys.routine.active(), updated);
      reset();
      toast.success(t("savedEdit"));
      goToDashboard();
    } catch (error) {
      // Edits require connectivity in this version — no offline queue for them
      // (queuing a partial edit against a routine that might change meanwhile
      // is riskier than just asking the user to retry when online).
      const detail = error instanceof ApiError ? error.detail : null;
      toast.error(detail || t("editOfflineError"));
      setSaving(false);
    }
  };

  const handleSaveCreate = async () => {
    setSaving(true);
    try {
      if (typeof navigator !== "undefined" && navigator.onLine === false) {
        throw new Error("offline");
      }
      const routine = await createManualRoutine(draft);
      await db.routineCache.put(routine);
      queryClient.setQueryData(queryKeys.routine.active(), routine);
      reset();
      toast.success(t("savedOnline"));
      goToDashboard();
    } catch (error) {
      if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
        toast.error(error.detail || t("saveError"));
        setSaving(false);
        return;
      }
      // Offline or server/network error: queue it for the sync engine.
      try {
        await queuePendingRoutine(draft);
        reset();
        toast.success(t("savedOffline"));
        goToDashboard();
      } catch {
        toast.error(t("saveError"));
        setSaving(false);
      }
    }
  };

  const handleSave = async () => {
    if (errors.length > 0) {
      setShowErrors(true);
      const firstErrorWeekIdx = draft.weeks.findIndex((w) =>
        errors.some((error) => error.weekNumber === w.week_number),
      );
      if (firstErrorWeekIdx >= 0) setSelectedWeekIndex(firstErrorWeekIdx);
      return;
    }
    if (isEditing) {
      await handleSaveEdit();
    } else {
      await handleSaveCreate();
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <Link
        href={`/${locale}/routine`}
        className="flex h-12 w-fit items-center gap-1.5 rounded-full border border-white/[0.22] px-4 text-base font-semibold"
      >
        <ArrowLeft aria-hidden="true" size={22} strokeWidth={1.6} />
        {t("back")}
      </Link>

      <div className="flex flex-col gap-3">
        <p className="text-sm font-black uppercase tracking-[0.22em] text-[#a6ff00]">{t("eyebrow")}</p>
        <h1 className="text-[42px] font-black leading-none tracking-tight md:text-6xl">
          {isEditing ? t("editTitle") : t("title")}
        </h1>
      </div>

      {mode === "create" && !isOnline ? (
        <div
          role="status"
          className="flex items-center gap-2.5 rounded-[1.25rem] border border-[#a6ff00]/40 bg-[#a6ff00]/[0.07] px-4 py-3 text-[15px] font-semibold leading-snug text-[#a6ff00]"
        >
          <WifiOff aria-hidden="true" size={20} strokeWidth={1.5} className="shrink-0" />
          {t("offlineNotice")}
        </div>
      ) : null}

      <div className="flex flex-col gap-3">
        <div role="group" aria-label={t("week")} className="grid grid-cols-4 gap-1.5">
          {draft.weeks.map((w, index) => {
            const weekHasError = errors.some((error) => error.weekNumber === w.week_number);
            const isSelected = index === weekIndex;
            return (
              <button
                key={index}
                type="button"
                aria-pressed={isSelected}
                onClick={() => setSelectedWeekIndex(index)}
                className={`flex h-[52px] items-center justify-center gap-1.5 rounded-[26px] px-1 text-[15px] font-bold ${
                  isSelected
                    ? "bg-[#a6ff00] text-black"
                    : showErrors && weekHasError
                      ? "border-[1.5px] border-red-400"
                      : "border border-white/[0.22] text-white"
                }`}
              >
                {showErrors && weekHasError ? (
                  <AlertCircle aria-hidden="true" size={16} strokeWidth={2} className="text-red-400" />
                ) : null}
                <span>
                  {t("week")} {w.week_number}
                </span>
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={addWeek}
            disabled={draft.weeks.length >= 4}
            className="flex h-12 items-center justify-center gap-2 rounded-3xl border-[1.5px] border-white/30 text-base font-bold disabled:opacity-40"
          >
            <Plus aria-hidden="true" size={20} strokeWidth={2} />
            {t("addWeek")}
          </button>
          <button
            type="button"
            onClick={() => {
              removeWeek(weekIndex);
              setSelectedWeekIndex((index) => Math.max(0, index - 1));
            }}
            disabled={draft.weeks.length <= 1}
            className="flex h-12 items-center justify-center gap-2 rounded-3xl border-[1.5px] border-white/30 text-base font-bold disabled:opacity-40"
          >
            <Minus aria-hidden="true" size={20} strokeWidth={2} />
            {t("removeWeek")}
          </button>
        </div>
      </div>

      {showErrors && errors.length > 0 ? (
        <div role="alert" className="flex flex-col gap-3 rounded-3xl border border-red-400/50 bg-red-400/[0.07] p-4">
          <p className="text-sm font-extrabold uppercase tracking-[0.08em] text-red-400">{t("reviewBeforeSave")}</p>
          <ul className="flex flex-col gap-2">
            {errors.map((error, index) => (
              <li key={index} className="flex items-start gap-2 text-[15px] font-semibold leading-snug text-red-300">
                <AlertCircle aria-hidden="true" size={20} strokeWidth={1.8} className="mt-0.5 shrink-0" />
                <span>{describeValidationError(tv, error)}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {mode === "create" && hydrated && isBlankDraft(draft) ? <TemplatePicker /> : null}

      {week ? (
        <RoutineWeekEditor
          weekIdx={weekIndex}
          week={week}
          locale={locale}
          errors={showErrors ? weekErrors : []}
        />
      ) : null}

      <button
        type="button"
        onClick={() => void handleSave()}
        disabled={saving}
        className="apex-button flex h-[62px] items-center justify-center gap-2.5 rounded-[1.9375rem] text-lg font-extrabold disabled:opacity-60"
      >
        <Save aria-hidden="true" size={22} strokeWidth={2} />
        {saving ? t("saving") : isEditing ? t("saveEdit") : t("save")}
      </button>
    </div>
  );
}
