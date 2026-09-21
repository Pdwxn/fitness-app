import { describe, expect, it } from "vitest";

import { buildTemplate, TEMPLATE_IDS } from "@/lib/routineTemplates";

describe("routine templates", () => {
  it("every template is a full week with at least one training day", () => {
    for (const id of TEMPLATE_IDS) {
      const days = buildTemplate(id, (key) => key);
      expect(days).toHaveLength(7);
      expect(days.some((day) => !day.rest)).toBe(true);
    }
  });

  it("names days through the translator and marks rest days", () => {
    const days = buildTemplate("push_pull_legs", (key) => key.toUpperCase());
    expect(days.map((day) => day.name)).toEqual(["PUSH", "PULL", "LEGS", "REST", "PUSH", "PULL", "LEGS"]);
    expect(days.map((day) => day.rest === true)).toEqual([false, false, false, true, false, false, false]);
  });
});
