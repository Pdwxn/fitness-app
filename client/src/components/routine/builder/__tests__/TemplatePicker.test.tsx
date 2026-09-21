import { fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { beforeEach, describe, expect, it } from "vitest";

import es from "@/messages/es.json";
import { useRoutineBuilderStore } from "@/store/routineBuilderStore";

import { isBlankDraft, TemplatePicker } from "../TemplatePicker";

beforeEach(() => {
  useRoutineBuilderStore.setState({ hydrated: true });
  useRoutineBuilderStore.getState().reset();
});

describe("TemplatePicker", () => {
  it("fills the draft with the chosen template, in the user's language", () => {
    render(
      <NextIntlClientProvider locale="es" messages={es}>
        <TemplatePicker />
      </NextIntlClientProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: /Empuje \/ Tirón \/ Piernas/ }));

    const days = useRoutineBuilderStore.getState().draft.weeks[0].days;
    expect(days.map((day) => day.day_name)).toEqual([
      "Empuje", "Tirón", "Piernas", "Descanso", "Empuje", "Tirón", "Piernas",
    ]);
    expect(days[3].is_rest_day).toBe(true);
  });

  it("only counts an untouched draft as blank", () => {
    expect(isBlankDraft(useRoutineBuilderStore.getState().draft)).toBe(true);
    useRoutineBuilderStore.getState().setDayName(0, 0, "Push");
    expect(isBlankDraft(useRoutineBuilderStore.getState().draft)).toBe(false);
  });
});
