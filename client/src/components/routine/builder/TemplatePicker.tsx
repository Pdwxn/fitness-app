"use client";

import { useTranslations } from "next-intl";

import { buildTemplate, TEMPLATE_IDS, type RoutineTemplateId } from "@/lib/routineTemplates";
import { useRoutineBuilderStore } from "@/store/routineBuilderStore";

/** True for a draft nobody has touched: one week, one unnamed day, nothing in it. */
export function isBlankDraft(draft: { weeks: Array<{ days: Array<{ day_name: string; exercises: unknown[] }> }> }) {
  return (
    draft.weeks.length === 1 &&
    draft.weeks[0].days.length === 1 &&
    draft.weeks[0].days[0].day_name.trim() === "" &&
    draft.weeks[0].days[0].exercises.length === 0
  );
}

/**
 * "Start from a template" chips, shown only while the draft is still blank so
 * a template can never overwrite work in progress.
 */
export function TemplatePicker() {
  const t = useTranslations("Builder.templates");
  const applyTemplate = useRoutineBuilderStore((state) => state.applyTemplate);

  const apply = (id: RoutineTemplateId) => applyTemplate(buildTemplate(id, (key) => t(`days.${key}`)));

  return (
    <section aria-label={t("title")} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-extrabold">{t("title")}</h2>
        <p className="text-[15px] leading-snug text-white/60">{t("description")}</p>
      </div>
      <div className="grid gap-2.5 sm:grid-cols-3">
        {TEMPLATE_IDS.map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => apply(id)}
            className="flex flex-col items-start gap-0.5 rounded-2xl border border-white/[0.22] px-4 py-3 text-left"
          >
            <span className="text-base font-extrabold">{t(`names.${id}`)}</span>
            <span className="text-sm text-white/60">{t(`hints.${id}`)}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
