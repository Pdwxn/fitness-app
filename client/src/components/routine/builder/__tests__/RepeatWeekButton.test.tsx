import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { beforeEach, describe, expect, it } from "vitest";

import es from "@/messages/es.json";
import { useRoutineBuilderStore } from "@/store/routineBuilderStore";

import { RepeatWeekButton } from "../RepeatWeekButton";

function renderButton() {
  return render(
    <NextIntlClientProvider locale="es" messages={es}>
      <RepeatWeekButton weekIdx={0} weekNumber={1} />
    </NextIntlClientProvider>,
  );
}

beforeEach(() => {
  useRoutineBuilderStore.setState({ hydrated: true });
  useRoutineBuilderStore.getState().reset();
});

describe("RepeatWeekButton", () => {
  it("asks for confirmation before copying the week", async () => {
    renderButton();
    await userEvent.click(screen.getByRole("button", { name: /Repetir esta semana/ }));

    const dialog = screen.getByRole("alertdialog", { name: "¿Repetir la Semana 1?" });
    expect(dialog).toHaveAccessibleDescription(/se copiarán sus días y ejercicios/i);
  });

  it("cancelling does not touch the draft", async () => {
    const user = userEvent.setup();
    renderButton();
    await user.click(screen.getByRole("button", { name: /Repetir esta semana/ }));
    await user.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(useRoutineBuilderStore.getState().draft.weeks).toHaveLength(1);
  });

  it("confirming fills the draft out to 4 weeks with a copy of this one", async () => {
    useRoutineBuilderStore.getState().setDayName(0, 0, "Push");
    const user = userEvent.setup();
    renderButton();
    await user.click(screen.getByRole("button", { name: /Repetir esta semana/ }));
    await user.click(screen.getByRole("button", { name: "Repetir" }));

    const { weeks } = useRoutineBuilderStore.getState().draft;
    expect(weeks).toHaveLength(4);
    expect(weeks.every((week) => week.days[0].day_name === "Push")).toBe(true);
    expect(screen.queryByRole("alertdialog")).toBeNull();
  });
});
