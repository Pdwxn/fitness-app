import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { beforeEach, describe, expect, it, vi } from "vitest";

import es from "@/messages/es.json";
import type { RoutineExercise } from "@/types/routine";

const useProgressionSuggestion = vi.fn();
const weightUnit = vi.fn(() => "kg");
vi.mock("@/hooks/useProgression", () => ({ useProgressionSuggestion: () => useProgressionSuggestion() }));
vi.mock("@/hooks/useWeightUnit", () => ({ useWeightUnit: () => weightUnit() }));

const { ProgressionBadge } = await import("../ProgressionBadge");

const exercise = { id: "e1", name: "Press" } as RoutineExercise;
// Last time: 60 kg at the top of the range, barbell (+2.5 kg).
const suggestion = {
  policy: "double",
  kind: "increase_weight",
  nextWeightKg: 62.5,
  nextReps: "8-10",
  params: { increment: 2.5 },
};

function renderBadge() {
  return render(
    <NextIntlClientProvider locale="es" messages={es}>
      <ProgressionBadge exercise={exercise} />
    </NextIntlClientProvider>,
  );
}

beforeEach(() => {
  useProgressionSuggestion.mockReturnValue(suggestion);
  weightUnit.mockReturnValue("kg");
});

describe("ProgressionBadge", () => {
  it("suggests the next weight in kg", () => {
    renderBadge();
    expect(screen.getByText(/prueba \+2.5kg/)).toBeInTheDocument();
    expect(screen.getByText(/62.5 kg x 8-10/)).toBeInTheDocument();
  });

  it("suggests it in plate-sized pounds instead of converting the kg jump", () => {
    weightUnit.mockReturnValue("lb");
    renderBadge();
    // 60 kg = 132.3 lb -> 132.5, plus a 5 lb jump.
    expect(screen.getByText(/prueba \+5lb/)).toBeInTheDocument();
    expect(screen.getByText(/137.5 lb x 8-10/)).toBeInTheDocument();
  });

  it("renders nothing when there is nothing actionable", () => {
    useProgressionSuggestion.mockReturnValue({ policy: "off", kind: "policy_off" });
    const { container } = renderBadge();
    expect(container).toBeEmptyDOMElement();
  });
});
