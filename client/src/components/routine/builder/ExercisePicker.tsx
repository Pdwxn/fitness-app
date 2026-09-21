"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { ChevronDown, Plus, Search, SearchX, X } from "lucide-react";

import { useExerciseCatalog, useCatalogSyncStatus } from "@/hooks/useExerciseCatalog";
import { EMPTY_CATALOG_FILTERS, type CatalogFilters, type Exercise } from "@/types/exercise";

import { ExerciseThumb } from "./ExerciseThumb";

type ExercisePickerProps = {
  onPick: (exercise: Exercise) => void;
  onAddCustom: () => void;
  onClose: () => void;
};

function FilterSelect({
  label,
  allLabel,
  value,
  options,
  onChange,
}: {
  label: string;
  allLabel: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-label={label}
        className={`h-12 w-full appearance-none rounded-3xl border px-4 pr-9 text-base font-semibold ${
          value ? "border-[#a6ff00] bg-[#a6ff00] text-black" : "border-white/[0.22] bg-transparent text-white"
        }`}
      >
        <option value="">{`${label}: ${allLabel}`}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {`${label}: ${option}`}
          </option>
        ))}
      </select>
      <ChevronDown
        aria-hidden="true"
        size={18}
        strokeWidth={2}
        className={`pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 ${value ? "text-black" : "text-white"}`}
      />
    </div>
  );
}

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

  const update = (patch: Partial<CatalogFilters>) => setFilters((current) => ({ ...current, ...patch }));

  if (typeof document === "undefined") return null;

  const showNoCatalog = neverSynced || isEmpty;

  // Portal to <body>: an ancestor `.apex-card` sets `backdrop-filter`, which
  // makes it the containing block for `position: fixed`. The portal escapes it.
  return createPortal(
    <div className="fixed inset-0 z-50 flex flex-col overflow-y-auto bg-[#020303] p-4 pb-36 sm:items-center sm:justify-center sm:p-6">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
        <div className="flex min-h-[56px] items-center justify-between gap-3">
          <h1 className="text-2xl font-black tracking-tight sm:text-[28px]">{t("title")}</h1>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("close")}
            className="grid size-12 shrink-0 place-items-center rounded-full border border-white/[0.22] text-white"
          >
            <X aria-hidden="true" size={22} strokeWidth={1.6} />
          </button>
        </div>

        <label className="flex h-[54px] items-center gap-3 border-t border-white/[0.13]">
          <span className="sr-only">{t("search")}</span>
          <Search aria-hidden="true" size={22} strokeWidth={1.5} className="shrink-0 text-white/60" />
          <input
            type="search"
            value={filters.search}
            onChange={(event) => update({ search: event.target.value })}
            placeholder={t("search")}
            className="h-full min-w-0 flex-1 bg-transparent text-base text-white outline-none"
          />
        </label>

        {!showNoCatalog ? (
          <div role="group" aria-label={t("title")} className="flex flex-wrap gap-2">
            <FilterSelect
              label={t("muscle")}
              allLabel={t("all")}
              value={filters.muscle}
              options={facets.muscle}
              onChange={(muscle) => update({ muscle })}
            />
            <FilterSelect
              label={t("equipment")}
              allLabel={t("all")}
              value={filters.equipment}
              options={facets.equipment}
              onChange={(equipment) => update({ equipment })}
            />
            <FilterSelect
              label={t("category")}
              allLabel={t("all")}
              value={filters.category}
              options={facets.category}
              onChange={(category) => update({ category })}
            />
          </div>
        ) : null}

        <div className="border-t border-white/[0.13] pt-1">
          {showNoCatalog ? (
            <div role="status" className="flex flex-col items-start gap-4 pt-6">
              <span className="grid size-[72px] place-items-center rounded-full border-[1.5px] border-[#a6ff00]/55 bg-[#a6ff00]/10 text-[#a6ff00]">
                <SearchX aria-hidden="true" size={34} strokeWidth={1.5} />
              </span>
              <div>
                <p className="text-2xl font-black tracking-tight">{t("noCatalogTitle")}</p>
                <p className="mt-1.5 text-base leading-6 text-white/60">{t("noCatalogDescription")}</p>
              </div>
            </div>
          ) : isLoading ? (
            <p className="p-4 text-sm text-white/60">{t("syncing")}</p>
          ) : exercises.length === 0 ? (
            <p className="p-4 text-sm text-white/60">{t("empty")}</p>
          ) : (
            <ul className="flex flex-col">
              {exercises.slice(0, 200).map((exercise) => (
                <li key={exercise.external_id} className="border-b border-white/10 last:border-b-0">
                  <button
                    type="button"
                    onClick={() => onPick(exercise)}
                    aria-label={t("addAria", {
                      name: exercise.name,
                      muscle: exercise.primary_muscles[0] ?? "",
                      equipment: exercise.equipment,
                    })}
                    className="flex w-full items-center gap-3.5 py-3 text-left"
                  >
                    <ExerciseThumb src={exercise.image_url} gifSrc={exercise.gif_url} name={exercise.name} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[17px] font-extrabold leading-tight">{exercise.name}</span>
                      <span className="mt-0.5 block truncate text-[15px] font-medium text-white/60">
                        {exercise.primary_muscles[0]} · {exercise.equipment}
                      </span>
                    </span>
                    <span
                      aria-hidden="true"
                      className="grid size-11 shrink-0 place-items-center rounded-full border-[1.5px] border-[#a6ff00]/55 text-[#a6ff00]"
                    >
                      <Plus size={22} strokeWidth={2} />
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-10 bg-gradient-to-t from-[#020303] via-[#020303]/90 to-transparent px-4 pb-6 pt-10">
        <div className="mx-auto w-full max-w-2xl">
          <button
            type="button"
            onClick={onAddCustom}
            className={`flex h-[60px] w-full items-center justify-center gap-2.5 rounded-[1.875rem] text-lg font-extrabold ${
              showNoCatalog ? "apex-button" : "border-[1.5px] border-white/30 text-white"
            }`}
          >
            <Plus aria-hidden="true" size={22} strokeWidth={2} />
            {t("custom")}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
