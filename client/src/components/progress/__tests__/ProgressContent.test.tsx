import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import es from "@/messages/es.json";
import type { DailyLog } from "@/types/progress";
import type { Routine } from "@/types/routine";

const useDailyLogs = vi.fn();
const useProgressStats = vi.fn();

vi.mock("@/hooks/useDailyLogs", () => ({ useDailyLogs: () => useDailyLogs() }));
vi.mock("@/hooks/useProgressStats", () => ({ useProgressStats: () => useProgressStats() }));
vi.mock("@/hooks/useRoutineCache", () => ({ useRoutineCache: () => ({ routine }) }));

const routine = {
  id: "r1",
  cycle_started_on: "2026-09-07",
  created_at: "2026-09-01T00:00:00Z",
  weeks: [
    {
      id: "w1",
      week_number: 1,
      days: [1, 2, 3, 4, 5, 6, 7].map((n) => ({
        id: `d${n}`,
        day_number: n,
        day_name: n === 1 ? "Empuje" : `Día ${n}`,
        is_rest_day: ![1, 3, 5].includes(n),
        exercises: n === 1 ? [{ id: "bench", muscle_group: "pecho" }] : [],
      })),
    },
  ],
} as unknown as Routine;

const logs = [
  {
    id: "l1",
    routine_day_id: "d1",
    date: "2026-09-14",
    completed: true,
    day_note: "",
    exercises_done: [
      {
        exercise_id: "bench",
        exercise_name: "Press de banca",
        source_external_id: "bench",
        completed: true,
        actual_sets: null,
        actual_reps: null,
        actual_weight_kg: null,
        note: "",
        sets: [
          { reps: "10", weight_kg: "60", completed: true },
          { reps: "8", weight_kg: "70", completed: true },
        ],
      },
    ],
  },
] as unknown as DailyLog[];

const { ProgressContent } = await import("../ProgressContent");

function renderPage() {
  return render(
    <NextIntlClientProvider locale="es" messages={es}>
      <ProgressContent locale="es" />
    </NextIntlClientProvider>,
  );
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 8, 16, 10, 0)); // Wednesday
  useDailyLogs.mockReturnValue({ logs, isLoading: false, hasError: false, isOfflineFallback: false });
  useProgressStats.mockReturnValue({ stats: { completed_days: 1 }, isLoading: false, hasError: false, isOfflineFallback: false });
});
afterEach(() => vi.useRealTimers());

describe("ProgressContent", () => {
  it("shows the week's real volume, consistency, muscles and latest log", () => {
    renderPage();

    expect(screen.getByText("1160")).toBeInTheDocument(); // 10x60 + 8x70 -- Intl may format as 1160 or 1.160
    expect(screen.getByRole("img", { name: "Consistencia 50%" })).toBeInTheDocument();
    expect(screen.getByText("Sin datos del periodo anterior")).toBeInTheDocument();
    expect(screen.getByText("pecho")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Ver día: Empuje/ })).toHaveAttribute("href", "/es/routine/d1");
  });

  it("charts the heaviest set of the chosen exercise", () => {
    renderPage();
    expect(screen.getByRole("combobox", { name: "Ejercicio" })).toHaveValue("bench");
    expect(screen.getByRole("img", { name: /Press de banca.*de 70 kg.*a 70 kg/ })).toBeInTheDocument();
  });

  it("switches to the month view", async () => {
    vi.useRealTimers();
    renderPage();
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Este mes" }));

    expect(screen.getByRole("button", { name: "Este mes" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("Series por músculo · vs mes anterior")).toBeInTheDocument();
  });

  it("tells the user when they're looking at saved data", () => {
    useDailyLogs.mockReturnValue({ logs, isLoading: false, hasError: false, isOfflineFallback: true });
    renderPage();
    expect(screen.getByRole("status")).toHaveTextContent("progreso guardado en este dispositivo");
  });

  it("explains empty states instead of showing made-up numbers", () => {
    useDailyLogs.mockReturnValue({ logs: [], isLoading: false, hasError: false, isOfflineFallback: false });
    renderPage();

    expect(screen.getByText("Todavía no hay series registradas en este periodo.")).toBeInTheDocument();
    expect(screen.getByText("Registra series con peso para ver tu evolución.")).toBeInTheDocument();
    expect(screen.getByText(/Todavía no has registrado entrenamientos/)).toBeInTheDocument();
  });
});
