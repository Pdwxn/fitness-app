import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { StatsPreview } from "../StatsPreview";

const labels = {
  title: "Estadísticas",
  completedDays: "Días completados",
  totalExercises: "Ejercicios",
  activeRoutine: "Rutina activa",
  lastSync: "Último sync",
  pending: "Pendiente",
  never: "Nunca",
};

describe("StatsPreview", () => {
  it("shows each total with its label", () => {
    render(<StatsPreview labels={labels} completedDays={12} totalExercises={90} activeRoutine="9/2026" lastSync="21 sep, 10:00" />);

    expect(screen.getByRole("heading", { name: "Estadísticas" })).toBeInTheDocument();
    expect(screen.getByText("Días completados").previousElementSibling).toHaveTextContent("12");
    expect(screen.getByText("Ejercicios").previousElementSibling).toHaveTextContent("90");
    expect(screen.getByText("Rutina activa").previousElementSibling).toHaveTextContent("9/2026");
    expect(screen.getByText("Último sync").previousElementSibling).toHaveTextContent("21 sep, 10:00");
  });

  it("falls back to readable text when there's no routine or sync yet", () => {
    render(<StatsPreview labels={labels} completedDays={0} totalExercises={0} activeRoutine="" lastSync={null} />);

    expect(screen.getByText("Rutina activa").previousElementSibling).toHaveTextContent("Pendiente");
    expect(screen.getByText("Último sync").previousElementSibling).toHaveTextContent("Nunca");
  });
});
