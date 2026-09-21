import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { beforeEach, describe, expect, it, vi } from "vitest";

import es from "@/messages/es.json";
import type { DailyLog } from "@/types/progress";
import type { RoutineDay } from "@/types/routine";

const useDailyLogs = vi.fn();
const saveLogLocally = vi.fn<(log: DailyLog) => Promise<void>>(async () => undefined);
vi.mock("@/hooks/useDailyLogs", () => ({ useDailyLogs: (...args: unknown[]) => useDailyLogs(...args) }));
vi.mock("@/lib/sync", () => ({ saveLogLocally: (log: DailyLog) => saveLogLocally(log) }));

const { DailyLogForm } = await import("../DailyLogForm");

function makeDay(exercises: Partial<RoutineDay["exercises"][number]>[] = [{}]): RoutineDay {
  return {
    id: "day1",
    day_number: 1,
    day_name: "Push",
    is_rest_day: false,
    exercises: exercises.map((e, i) => ({
      id: `e${i + 1}`,
      name: i === 0 ? "Press de banca" : `Ejercicio ${i + 1}`,
      source_external_id: `cat${i + 1}`,
      sets: 3,
      reps: "8-10",
      weight_kg: "60.00",
      image_url: "",
      order: i + 1,
      variants: [],
      ...e,
    })),
  } as unknown as RoutineDay;
}

const today = () => {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-${String(now.getUTCDate()).padStart(2, "0")}`;
};

function renderForm(day: RoutineDay) {
  const ui = (d: RoutineDay) => (
    <NextIntlClientProvider locale="es" messages={es}>
      <DailyLogForm day={d} />
    </NextIntlClientProvider>
  );
  const view = render(ui(day));
  return { ...view, rerenderDay: (d: RoutineDay) => view.rerender(ui(d)) };
}

// The desktop panel (always mounted, showing whichever exercise is selected)
// and the mobile sheet (only mounted once a row is tapped, portaled to
// document.body) both render the same `ExerciseSheetContent`. As long as no
// row has been tapped, only the panel exists, so bare `screen` queries are
// unambiguous -- these helpers assume that for the single-exercise tests.
const setRow = (n: number) => screen.getAllByRole("listitem")[n - 1];
const reps = (n: number) => within(setRow(n)).getByRole("textbox", { name: /Repeticiones/ });
const kg = (n: number) => within(setRow(n)).getByRole("textbox", { name: /Peso/ });
const tick = (n: number) => within(setRow(n)).getByRole("checkbox");

/** Tap an exercise's list row (by name), opening the mobile sheet, and return queries scoped to it. */
async function openExercise(name: string) {
  await userEvent.click(screen.getByRole("button", { name: new RegExp(`^${name},`) }));
  return within(screen.getByRole("dialog"));
}

beforeEach(() => {
  saveLogLocally.mockClear();
  useDailyLogs.mockReturnValue({ logs: [], refreshLogs: vi.fn() });
});

describe("DailyLogForm per-set logging", () => {
  it("shows one row per planned set, with the planned weight and reps as a hint", () => {
    renderForm(makeDay());
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
    expect(kg(1)).toHaveValue("60");
    expect(reps(1)).toHaveValue("");
    expect(reps(1)).toHaveAttribute("placeholder", "8-10");
    expect(tick(1)).toHaveAttribute("aria-checked", "false");
  });

  it("one tap marks a set done and fills the reps as prescribed; all sets done completes the exercise and updates the list row", async () => {
    renderForm(makeDay());

    await userEvent.click(tick(1));
    expect(reps(1)).toHaveValue("10");
    expect(tick(1)).toHaveAttribute("aria-checked", "true");
    expect(screen.queryByText("Ejercicio completo")).toBeNull();
    expect(screen.getByRole("button", { name: /^Press de banca,/ })).toHaveTextContent("1/3");

    await userEvent.click(tick(2));
    await userEvent.click(tick(3));
    expect(screen.getByText("Ejercicio completo")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Press de banca,/ })).toHaveTextContent("3/3");
  });

  it("saves the sets AND the derived totals, cleaned of typos", async () => {
    renderForm(makeDay());

    await userEvent.clear(kg(1));
    await userEvent.type(kg(1), "62,5");
    await userEvent.type(reps(1), "9");
    await userEvent.click(tick(1));
    await userEvent.click(tick(2));
    await userEvent.click(screen.getByRole("button", { name: "Guardar progreso" }));

    expect(saveLogLocally).toHaveBeenCalledTimes(1);
    const saved = saveLogLocally.mock.calls[0][0];
    expect(saved.routine_day_id).toBe("day1");
    expect(saved.date).toBe(today());
    const entry = saved.exercises_done[0];
    expect(entry.sets).toEqual([
      { reps: "9", weight_kg: "62.5", completed: true },
      { reps: "10", weight_kg: "60", completed: true },
      { reps: null, weight_kg: "60", completed: false },
    ]);
    expect(entry).toMatchObject({
      source_external_id: "cat1",
      completed: false,
      actual_sets: 2,
      actual_reps: "9,10",
      actual_weight_kg: "62.5",
    });
  });

  it("can add and remove sets", async () => {
    renderForm(makeDay());
    await userEvent.click(screen.getByRole("button", { name: "+ Serie" }));
    expect(screen.getAllByRole("listitem")).toHaveLength(4);
    await userEvent.click(screen.getByRole("button", { name: "− Serie" }));
    await userEvent.click(screen.getByRole("button", { name: "− Serie" }));
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
  });

  it("opens a log saved before per-set logging as editable sets", () => {
    useDailyLogs.mockReturnValue({
      logs: [
        {
          id: "log1",
          routine_day_id: "day1",
          date: today(),
          completed: true,
          day_note: "",
          exercises_done: [
            {
              exercise_id: "e1",
              exercise_name: "Press de banca",
              completed: true,
              actual_sets: 4,
              actual_reps: "8",
              actual_weight_kg: "50.00",
              note: "",
            },
          ],
        },
      ],
      refreshLogs: vi.fn(),
    });

    renderForm(makeDay());

    expect(screen.getAllByRole("listitem")).toHaveLength(4);
    expect(reps(1)).toHaveValue("8");
    expect(kg(1)).toHaveValue("50");
    expect(tick(4)).toHaveAttribute("aria-checked", "true");
  });

  it("does not throw away what the user is typing when the routine refetches in the background", async () => {
    const day = makeDay();
    const { rerenderDay } = renderForm(day);

    await userEvent.type(reps(1), "7");
    await userEvent.click(tick(2));

    rerenderDay(makeDay()); // same routine, new object identity, like a react-query refetch

    expect(reps(1)).toHaveValue("7");
    expect(tick(2)).toHaveAttribute("aria-checked", "true");
  });
});

describe("DailyLogForm exercise list and sheet", () => {
  it("shows the day's progress and one list row per exercise", () => {
    renderForm(makeDay([{}, { sets: 2 }]));

    expect(screen.getByText("Progreso: 0 / 2 ejercicios")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Press de banca,/ })).toHaveTextContent("0/3");
    expect(screen.getByRole("button", { name: /^Ejercicio 2,/ })).toHaveTextContent("0/2");
  });

  it("tapping a list row opens the mobile sheet for that exercise", async () => {
    renderForm(makeDay([{}, { sets: 2 }]));

    const dialog = await openExercise("Ejercicio 2");
    expect(dialog.getByRole("heading", { name: "Ejercicio 2" })).toBeInTheDocument();
    expect(dialog.getAllByRole("listitem")).toHaveLength(2);
  });

  it("advances through exercises from the sheet, and offers to go back to the list on the last one", async () => {
    renderForm(makeDay([{}, { sets: 2 }]));

    let dialog = await openExercise("Press de banca");
    expect(dialog.getByRole("heading", { name: "Press de banca" })).toBeInTheDocument();
    expect(dialog.getByRole("button", { name: "Siguiente ejercicio" })).toBeInTheDocument();

    await userEvent.click(dialog.getByRole("button", { name: "Siguiente ejercicio" }));
    dialog = within(screen.getByRole("dialog"));
    expect(dialog.getByRole("heading", { name: "Ejercicio 2" })).toBeInTheDocument();
    expect(dialog.getByRole("button", { name: "Volver a la lista" })).toBeInTheDocument();

    await userEvent.click(dialog.getByRole("button", { name: "Volver a la lista" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("closing the mobile sheet keeps the logged progress", async () => {
    renderForm(makeDay([{}, { sets: 2 }]));

    const dialog = await openExercise("Ejercicio 2");
    await userEvent.click(dialog.getAllByRole("checkbox")[0]);
    await userEvent.click(screen.getByRole("button", { name: "Cerrar" }));

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByRole("button", { name: /^Ejercicio 2,/ })).toHaveTextContent("1/2");
  });

  it("restores a per-set log exactly across exercises, and appends exercises added to the routine since", () => {
    useDailyLogs.mockReturnValue({
      logs: [
        {
          id: "log1",
          routine_day_id: "day1",
          date: today(),
          completed: false,
          day_note: "",
          exercises_done: [
            {
              exercise_id: "e1",
              exercise_name: "Press de banca",
              completed: false,
              actual_sets: 1,
              actual_reps: "10",
              actual_weight_kg: "60",
              note: "",
              sets: [
                { reps: "10", weight_kg: "60", completed: true },
                { reps: null, weight_kg: "60", completed: false },
              ],
            },
          ],
        },
      ],
      refreshLogs: vi.fn(),
    });

    renderForm(makeDay([{}, { sets: 2 }])); // e2 was added after the log was saved

    // e1: 1 of 2 restored sets done; e2: fresh, 0 of 2 done.
    expect(screen.getByRole("button", { name: /^Press de banca,/ })).toHaveTextContent("1/2");
    expect(screen.getByRole("button", { name: /^Ejercicio 2,/ })).toHaveTextContent("0/2");
  });
});
