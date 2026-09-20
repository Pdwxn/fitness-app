import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import en from "@/messages/en.json";
import es from "@/messages/es.json";
import type { Routine, RoutineWeek } from "@/types/routine";

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

const { ActiveRoutineCard } = await import("../ActiveRoutineCard");

function week(n: number): RoutineWeek {
  const shape = ["Push", "Rest", "Pull", "Rest", "Legs", "Rest", "Rest"];
  return {
    id: `w${n}`,
    week_number: n,
    days: shape.map((name, i) => ({
      id: `w${n}d${i + 1}`,
      day_number: i + 1,
      day_name: `${name} W${n}`,
      is_rest_day: name === "Rest",
      exercises: name === "Rest" ? [] : [{ id: "x" }, { id: "y" }],
    })),
  } as unknown as RoutineWeek;
}

const routine = {
  id: "r1",
  weeks: [week(1), week(2)],
  cycle_started_on: "2026-09-07", // Monday
  created_at: "2026-09-01T00:00:00Z",
} as unknown as Routine;

const cardLabels = es.Dashboard.activeRoutine;

function setToday(y: number, m: number, d: number) {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(y, m - 1, d, 10, 0));
}

function renderWith(ui: React.ReactElement, locale: "es" | "en" = "es") {
  return render(
    <NextIntlClientProvider locale={locale} messages={locale === "es" ? es : en}>
      {ui}
    </NextIntlClientProvider>,
  );
}

beforeEach(() => vi.useRealTimers());
afterEach(() => vi.useRealTimers());

describe("ActiveRoutineCard (calendar schedule)", () => {
  const card = (locale: "es" | "en" = "es") =>
    renderWith(
      <ActiveRoutineCard
        routine={routine}
        href="/es/routine"
        dayHref={(id) => `/es/routine/${id}`}
        labels={locale === "es" ? cardLabels : en.Dashboard.activeRoutine}
      />,
      locale,
    );

  it("features today's workout when today is a training day, and opens that day", () => {
    setToday(2026, 9, 9); // Wednesday = Pull
    card();
    expect(screen.getByRole("heading", { name: "Pull W1" })).toBeInTheDocument();
    expect(screen.getByText(/Siguiente · Hoy/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Comenzar entrenamiento/ })).toHaveAttribute("href", "/es/routine/w1d3");
    expect(screen.queryByText(/día de descanso/)).toBeNull();
  });

  it("on a rest day says so and features the next training day", () => {
    setToday(2026, 9, 8); // Tuesday = rest
    card();
    expect(screen.getByText(/Hoy es día de descanso/)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Pull W1" })).toBeInTheDocument();
    expect(screen.getByText(/Siguiente · Mañana/)).toBeInTheDocument();
  });

  it("names the weekday when the next workout is further away", () => {
    setToday(2026, 9, 12); // Saturday -> Monday W2
    card();
    expect(screen.getByRole("heading", { name: "Push W2" })).toBeInTheDocument();
    expect(screen.getByText(/Siguiente · Lunes/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Comenzar/ })).toHaveAttribute("href", "/es/routine/w2d1");
  });

  it("is translated", () => {
    setToday(2026, 9, 8);
    card("en");
    expect(screen.getByText(/Today is a rest day/)).toBeInTheDocument();
    expect(screen.getByText(/Up next · Tomorrow/)).toBeInTheDocument();
  });

  it("falls back to the plain routine link when no dayHref is given", () => {
    setToday(2026, 9, 9);
    renderWith(<ActiveRoutineCard routine={routine} href="/es/routine" labels={cardLabels} />);
    expect(screen.getByRole("link", { name: /Comenzar/ })).toHaveAttribute("href", "/es/routine");
  });
});
