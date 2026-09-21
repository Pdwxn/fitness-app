import type { TemplateDay } from "@/store/routineBuilderStore";

/** Starting points for the builder: a week of days (Monday first) named for the split, without exercises. */
export type RoutineTemplateId = "full_body" | "upper_lower" | "push_pull_legs";

type Slot = { key: string; rest?: boolean };

const TEMPLATES: Record<RoutineTemplateId, Slot[]> = {
  full_body: [
    { key: "fullA" },
    { key: "rest", rest: true },
    { key: "fullB" },
    { key: "rest", rest: true },
    { key: "fullC" },
    { key: "rest", rest: true },
    { key: "rest", rest: true },
  ],
  upper_lower: [
    { key: "upperA" },
    { key: "lowerA" },
    { key: "rest", rest: true },
    { key: "upperB" },
    { key: "lowerB" },
    { key: "rest", rest: true },
    { key: "rest", rest: true },
  ],
  push_pull_legs: [
    { key: "push" },
    { key: "pull" },
    { key: "legs" },
    { key: "rest", rest: true },
    { key: "push" },
    { key: "pull" },
    { key: "legs" },
  ],
};

export const TEMPLATE_IDS = Object.keys(TEMPLATES) as RoutineTemplateId[];

/** The template's days, with `nameFor(key)` turning each slot key into the user's language. */
export function buildTemplate(id: RoutineTemplateId, nameFor: (key: string) => string): TemplateDay[] {
  return TEMPLATES[id].map((slot) => ({ name: nameFor(slot.key), rest: slot.rest }));
}
