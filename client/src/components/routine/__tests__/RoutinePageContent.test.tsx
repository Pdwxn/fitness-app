import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import es from "@/messages/es.json";
import type { DailyLog } from "@/types/progress";
import type { Routine, RoutineWeek } from "@/types/routine";

const useRoutineCache = vi.fn();
const usePendingRoutine = vi.fn();
const useDailyLogs = vi.fn();

vi.mock("@/hooks/useRoutineCache", () => ({ useRoutineCache: () => useRoutineCache() }));
vi.mock("@/hooks/usePendingRoutine", () => ({ usePendingRoutine: () => usePendingRoutine() }));
vi.mock("@/hooks/useDailyLogs", () => ({ useDailyLogs: () => useDailyLogs() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

const { RoutinePageContent } = await import("../RoutinePageContent");

function week(n: number, overrides: Partial<RoutineWeek> = {}): RoutineWeek {
  const shape = ["Empuje", "Descanso", "Tirón", "Descanso", "Piernas", "Descanso", "Descanso"];
  return {
    id: `w${n}`,
    week_number: n,
    days: shape.map((name, i) => ({
      id: `w${n}d${i + 1}`,
      day_number: i + 1,
      day_name: `${name} S${n}`,
      is_rest_day: name === "Descanso",
      exercises: name === "Descanso" ? [] : [{ id: "x" }, { id: "y" }, { id: "z" }],
    })),
    ...overrides,
  } as unknown as RoutineWeek;
}

function makeRoutine(overrides: Partial<Routine> = {}): Routine {
  return {
    id: "r1",
    source: "ai_generated",
    month: 9,
    year: 2026,
    cycle_started_on: "2026-09-07", // Monday
    created_at: "2026-09-01T00:00:00Z",
    weeks: [week(1), week(2)],
    ...overrides,
  } as unknown as Routine;
}

function setToday(y: number, m: number, d: number) {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(y, m - 1, d, 10, 0));
}

function renderPage() {
  return render(
    <NextIntlClientProvider locale="es" messages={es}>
      <RoutinePageContent locale="es" />
    </NextIntlClientProvider>,
  );
}

beforeEach(() => {
  usePendingRoutine.mockReturnValue({ hasPending: false, isLoading: false });
  useDailyLogs.mockReturnValue({ logs: [] });
});

afterEach(() => vi.useRealTimers());

describe("RoutinePageContent states", () => {
  it("shows a loading message while the routine or pending-routine check are in flight", () => {
    useRoutineCache.mockReturnValue({ routine: null, isLoading: true, hasError: false, isOfflineFallback: false });
    renderPage();
    expect(screen.getByText("Cargando tu rutina...")).toBeInTheDocument();
  });

  it("shows an error message when the routine failed to load and nothing is cached", () => {
    useRoutineCache.mockReturnValue({ routine: null, isLoading: false, hasError: true, isOfflineFallback: false });
    renderPage();
    expect(screen.getByText(/No pudimos cargar tu rutina/)).toBeInTheDocument();
  });

  it("shows the offline-fallback banner alongside a cached routine", () => {
    useRoutineCache.mockReturnValue({
      routine: makeRoutine(),
      isLoading: false,
      hasError: false,
      isOfflineFallback: true,
    });
    setToday(2026, 9, 9);
    renderPage();
    expect(screen.getByText(/última rutina guardada/)).toBeInTheDocument();
  });

  it("offers the manual/AI choice when there is no active routine", () => {
    useRoutineCache.mockReturnValue({ routine: null, isLoading: false, hasError: false, isOfflineFallback: false });
    renderPage();
    expect(screen.getByRole("heading", { name: "¿Cómo quieres empezar?" })).toBeInTheDocument();
    expect(screen.queryByText(/se guardó en este dispositivo/)).toBeNull();
  });

  it("also shows the pending banner when a routine was built offline and is waiting to sync", () => {
    useRoutineCache.mockReturnValue({ routine: null, isLoading: false, hasError: false, isOfflineFallback: false });
    usePendingRoutine.mockReturnValue({ hasPending: true, isLoading: false });
    renderPage();
    expect(screen.getByText(/se guardó en este dispositivo/)).toBeInTheDocument();
  });
});

describe("RoutinePageContent with an active routine", () => {
  it("shows the monthly badge and only the change-routine action for an AI-generated routine", () => {
    useRoutineCache.mockReturnValue({
      routine: makeRoutine(),
      isLoading: false,
      hasError: false,
      isOfflineFallback: false,
    });
    setToday(2026, 9, 9); // Wednesday, week 1
    renderPage();

    expect(screen.getByText("Plan mensual 9/2026")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Editar rutina/ })).toBeNull();
    expect(screen.getByRole("button", { name: /Cambiar de rutina/ })).toBeInTheDocument();
  });

  it("shows the manual badge and both actions for a manual routine", () => {
    useRoutineCache.mockReturnValue({
      routine: makeRoutine({ source: "manual", month: null, year: null }),
      isLoading: false,
      hasError: false,
      isOfflineFallback: false,
    });
    setToday(2026, 9, 9);
    renderPage();

    expect(screen.getByText("Rutina manual")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Editar rutina/ })).toHaveAttribute(
      "href",
      "/es/routine/builder?mode=edit",
    );
  });

  it("opens on the current week and marks today's day", () => {
    useRoutineCache.mockReturnValue({
      routine: makeRoutine(),
      isLoading: false,
      hasError: false,
      isOfflineFallback: false,
    });
    setToday(2026, 9, 16); // week 2, Wednesday = Tirón
    renderPage();

    expect(screen.getByRole("button", { name: "Semana 2" })).toHaveClass("bg-[#a6ff00]");
    expect(screen.getByRole("link", { name: /Tirón S2 · HOY/ })).toHaveAttribute("href", "/es/routine/w2d3");
  });

  it("switches the visible days when a different week is selected", async () => {
    useRoutineCache.mockReturnValue({
      routine: makeRoutine(),
      isLoading: false,
      hasError: false,
      isOfflineFallback: false,
    });
    setToday(2026, 9, 9); // week 1
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderPage();

    expect(screen.getByRole("link", { name: /^Empuje S1/ })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Semana 2" }));
    expect(screen.queryByRole("link", { name: /^Empuje S1/ })).toBeNull();
    expect(screen.getByRole("link", { name: /^Piernas S2/ })).toBeInTheDocument();
  });

  it("hides the week picker for a single-week routine", () => {
    useRoutineCache.mockReturnValue({
      routine: makeRoutine({ weeks: [week(1)] }),
      isLoading: false,
      hasError: false,
      isOfflineFallback: false,
    });
    setToday(2026, 9, 9);
    renderPage();
    expect(screen.queryByRole("group", { name: "Semana" })).toBeNull();
  });

  it("marks a day as completed when a matching log exists for its computed calendar date", () => {
    useRoutineCache.mockReturnValue({
      routine: makeRoutine(),
      isLoading: false,
      hasError: false,
      isOfflineFallback: false,
    });
    useDailyLogs.mockReturnValue({
      logs: [
        { routine_day_id: "w1d1", date: "2026-09-07", completed: true } as unknown as DailyLog,
      ],
    });
    setToday(2026, 9, 9); // week 1
    renderPage();

    const empuje = screen.getByRole("link", { name: /^Empuje S1$/ });
    const tiron = screen.getByRole("link", { name: /^Tirón S1/ });
    expect(within(empuje).getByRole("img", { name: "Completado" })).toBeInTheDocument();
    expect(within(tiron).queryByRole("img", { name: "Completado" })).toBeNull();
  });
});
