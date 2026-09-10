"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";

import { useExerciseCatalog, useCatalogSyncStatus } from "@/hooks/useExerciseCatalog";
import { EMPTY_CATALOG_FILTERS, type CatalogFilters, type Exercise } from "@/types/exercise";

import { ExerciseThumb } from "./ExerciseThumb";

type ExercisePickerProps = {
  onPick: (exercise: Exercise) => void;
  onAddCustom: () => void;
  onClose: () => void;
};

export function ExercisePicker({ onPick, onAddCustom, onClose }: ExercisePickerProps) {
  const t = useTranslations("Builder.picker");
  const [filters, setFilters] = useState<CatalogFilters>(EMPTY_CATALOG_FILTERS);
  const { exercises, facets, isLoading, isEmpty } = useExerciseCatalog(filters);
  const { neverSynced } = useCatalogSyncStatus();

  // Lock body scroll while the picker is open.
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  const update = (patch: Partial<CatalogFilters>) =>
    setFilters((current) => ({ ...current, ...patch }));

  if (typeof document === "undefined") return null;

  // Portal to <body>: an ancestor `.apex-card` sets `backdrop-filter`, which
  // makes it the containing block for `position: fixed`. The portal escapes it.
  return createPortal(
    <div className="fixed inset-0 z-50 flex flex-col bg-black/80 p-4 backdrop-blur-sm">
      <div className="apex-card mx-auto flex h-full w-full max-w-2xl flex-col overflow-hidden rounded-[1.5rem]">
        <div className="flex items-center justify-between border-b border-white/10 p-4">
          <h3 className="text-lg font-black text-white">{t("title")}</h3>
          <button type="button" onClick={onClose} className="text-sm font-bold text-white/60">
            {t("close")}
          </button>
        </div>

        <div className="grid gap-2 border-b border-white/10 p-4 sm:grid-cols-2">
          <input
            type="search"
            value={filters.search}
            onChange={(event) => update({ search: event.target.value })}
            placeholder={t("search")}
            className="rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm text-white"
          />
          <select
            value={filters.muscle}
            onChange={(event) => update({ muscle: event.target.value })}
            className="rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm text-white"
          >
            <option value="">{`${t("muscle")}: ${t("all")}`}</option>
            {facets.muscle.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          <select
            value={filters.equipment}
            onChange={(event) => update({ equipment: event.target.value })}
            className="rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm text-white"
          >
            <option value="">{`${t("equipment")}: ${t("all")}`}</option>
            {facets.equipment.map((e) => (
              <option key={e} value={e}>
                {e}
              </option>
            ))}
          </select>
          <select
            value={filters.category}
            onChange={(event) => update({ category: event.target.value })}
            className="rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm text-white"
          >
            <option value="">{`${t("category")}: ${t("all")}`}</option>
            {facets.category.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {neverSynced ? (
            <p className="p-4 text-sm font-bold text-amber-200">{t("neverSynced")}</p>
          ) : isLoading ? (
            <p className="p-4 text-sm text-white/60">{t("syncing")}</p>
          ) : isEmpty ? (
            <p className="p-4 text-sm font-bold text-amber-200">{t("neverSynced")}</p>
          ) : exercises.length === 0 ? (
            <p className="p-4 text-sm text-white/60">{t("empty")}</p>
          ) : (
            <ul className="flex flex-col gap-1">
              {exercises.slice(0, 200).map((exercise) => (
                <li key={exercise.external_id}>
                  <button
                    type="button"
                    onClick={() => onPick(exercise)}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left hover:bg-white/5"
                  >
                    <ExerciseThumb src={exercise.image_url} name={exercise.name} />
                    <span className="flex-1 text-sm font-bold text-white">{exercise.name}</span>
                    <span className="hidden text-xs text-white/45 sm:block">
                      {exercise.primary_muscles[0]} · {exercise.equipment}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="border-t border-white/10 p-3">
          <button
            type="button"
            onClick={onAddCustom}
            className="apex-button-outline w-full rounded-xl py-2 text-sm font-black"
          >
            {t("custom")}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
