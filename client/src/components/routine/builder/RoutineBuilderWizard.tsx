"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { queryKeys } from "@/lib/query-keys";
import { queryClient } from "@/lib/query-client";
import { db } from "@/lib/db";
import { createManualRoutine, updateManualRoutine } from "@/lib/api/routines";
import { ApiError } from "@/lib/api/authenticated-client";
import { useRoutineCache } from "@/hooks/useRoutineCache";
import {
  queuePendingRoutine,
  useRoutineBuilderStore,
  validateDraft,
  type DraftValidationError,
} from "@/store/routineBuilderStore";

import { RoutineWeekEditor } from "./RoutineWeekEditor";

type RoutineBuilderWizardProps = { locale: string; mode?: "create" | "edit" };

type ValidationTranslator = (key: string, values?: Record<string, string | number>) => string;

function messageFor(tv: ValidationTranslator, error: DraftValidationError): string {
  switch (error.code) {
    case "no_training_day":
      return tv("noTrainingDay", { week: error.weekNumber });
    case "empty_training_day":
      return tv("emptyTrainingDay", { week: error.weekNumber, day: error.dayNumber });
    case "unnamed_day":
      return tv("unnamedDay", { week: error.weekNumber, day: error.dayNumber });
    case "unnamed_exercise":
      return tv("unnamedExercise", { week: error.weekNumber, day: error.dayNumber });
  }
}

export function RoutineBuilderWizard({ locale, mode = "create" }: RoutineBuilderWizardProps) {
  const t = useTranslations("Builder");
  const tvRaw = useTranslations("Builder.validation");
  const tv: ValidationTranslator = (key, values) => tvRaw(key, values);
  const router = useRouter();

  // Edit mode loads the current active routine; create mode never fetches it.
  const { routine, isLoading: routineLoading } = useRoutineCache();

  const draft = useRoutineBuilderStore((state) => state.draft);
  const hydrated = useRoutineBuilderStore((state) => state.hydrated);
  const hydrate = useRoutineBuilderStore((state) => state.hydrate);
  const startEditing = useRoutineBuilderStore((state) => state.startEditing);
  const editingRoutineId = useRoutineBuilderStore((state) => state.editingRoutineId);
  const addWeek = useRoutineBuilderStore((state) => state.addWeek);
  const reset = useRoutineBuilderStore((state) => state.reset);

  const [saving, setSaving] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [editUnavailable, setEditUnavailable] = useState(false);

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
      return;
    }
    if (isEditing) {
      await handleSaveEdit();
    } else {
      await handleSaveCreate();
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {draft.weeks.map((week, weekIdx) => (
        <RoutineWeekEditor
          key={weekIdx}
          weekIdx={weekIdx}
          week={week}
          canRemove={draft.weeks.length > 1}
        />
      ))}

      {draft.weeks.length < 4 ? (
        <button
          type="button"
          onClick={addWeek}
          className="apex-button-outline w-full rounded-xl py-2.5 text-sm font-black"
        >
          {t("addWeek")}
        </button>
      ) : null}

      {showErrors && errors.length > 0 ? (
        <ul className="rounded-2xl border border-red-400/30 bg-red-500/10 p-4 text-sm font-bold text-red-200">
          {errors.map((error, index) => (
            <li key={index}>{messageFor(tv, error)}</li>
          ))}
        </ul>
      ) : null}

      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="apex-button w-full rounded-2xl py-3 text-base font-black"
      >
        {saving ? t("saving") : isEditing ? t("saveEdit") : t("save")}
      </button>
    </div>
  );
}
