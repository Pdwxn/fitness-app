import { describe, expect, it } from "vitest";

import { routinePeriodLabel, routineToDraft } from "@/types/routine";
import type { Routine } from "@/types/routine";

const manualRoutine: Routine = {
  id: "r1",
  source: "manual",
  month: null,
  year: null,
  is_active: true,
  generated_at: null,
  gemini_prompt_hash: "",
  created_at: "",
  updated_at: "",
  weeks: [
    {
      id: "w1",
      week_number: 1,
      focus: "Base",
      notes: "notes",
      created_at: "",
      updated_at: "",
      days: [
        {
          id: "d1",
          day_number: 1,
          day_name: "Push",
          is_rest_day: false,
          created_at: "",
          updated_at: "",
          exercises: [
            {
              id: "e1",
              name: "Bench Press",
              muscle_group: "chest",
              source_external_id: "Bench_Press",
              sets: 4,
              reps: "8",
              weight_kg: "40.00",
              rest_seconds: 90,
              image_url: "https://example.com/x.jpg",
              video_url: "",
              variants: [],
              instructions: "",
              search_term: "",
              order: 1,
              created_at: "",
              updated_at: "",
            },
          ],
        },
        {
          id: "d2",
          day_number: 2,
          day_name: "Rest",
          is_rest_day: true,
          created_at: "",
          updated_at: "",
          exercises: [],
        },
      ],
    },
  ],
};

describe("routineToDraft", () => {
  it("strips server-only fields and keeps editable content", () => {
    const draft = routineToDraft(manualRoutine);
    expect(draft.weeks).toHaveLength(1);
    expect(draft.weeks[0]).toMatchObject({ week_number: 1, focus: "Base", notes: "notes" });
    expect(draft.weeks[0].days).toHaveLength(2);
    expect(draft.weeks[0].days[1]).toMatchObject({ day_name: "Rest", is_rest_day: true, exercises: [] });

    const exercise = draft.weeks[0].days[0].exercises[0];
    expect(exercise).toEqual({
      name: "Bench Press",
      external_id: "Bench_Press",
      muscle_group: "chest",
      sets: 4,
      reps: "8",
      weight_kg: "40.00",
      rest_seconds: 90,
      order: 1,
    });
    // image_url / id / created_at etc. must not leak into the editable draft
    expect(exercise).not.toHaveProperty("image_url");
    expect(exercise).not.toHaveProperty("id");
  });

  it("round-trips through the manual routine payload shape", () => {
    const draft = routineToDraft(manualRoutine);
    expect(JSON.parse(JSON.stringify(draft))).toEqual(draft);
  });
});

describe("routinePeriodLabel", () => {
  it("formats month/year for AI routines", () => {
    expect(routinePeriodLabel({ month: 9, year: 2026 })).toBe("9/2026");
  });

  it("is null for manual routines (no month/year)", () => {
    expect(routinePeriodLabel({ month: null, year: null })).toBeNull();
  });
});
