import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { beforeEach, describe, expect, it, vi } from "vitest";

import es from "@/messages/es.json";
import { useRoutineBuilderStore } from "@/store/routineBuilderStore";
import type { Routine } from "@/types/routine";

const useRoutineCache = vi.fn();
const createManualRoutine = vi.fn();
const routerPush = vi.fn();
const routerRefresh = vi.fn();

vi.mock("@/hooks/useRoutineCache", () => ({ useRoutineCache: () => useRoutineCache() }));
vi.mock("@/lib/api/routines", () => ({
  createManualRoutine: (...args: unknown[]) => createManualRoutine(...args),
  updateManualRoutine: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: routerPush, refresh: routerRefresh, replace: vi.fn() }),
}));

// The exercise catalog picker needs a lot of unrelated infrastructure
// (IndexedDB-backed catalog, sync status); these tests exercise the wizard's
// own state (weeks/days/validation/save), so the picker itself is stubbed out
// -- its "custom exercise" affordance is the one path exercised here.
vi.mock("../ExercisePicker", () => ({
  ExercisePicker: ({ onAddCustom, onClose }: { onAddCustom: () => void; onClose: () => void }) => (
    <div role="dialog">
      <button type="button" onClick={onAddCustom}>
        Ejercicio personalizado
      </button>
      <button type="button" onClick={onClose}>
        Cerrar
      </button>
    </div>
  ),
}));

const { RoutineBuilderWizard } = await import("../RoutineBuilderWizard");

function renderWizard(mode: "create" | "edit" = "create") {
  return render(
    <NextIntlClientProvider locale="es" messages={es}>
      <RoutineBuilderWizard locale="es" mode={mode} />
    </NextIntlClientProvider>,
  );
}

beforeEach(() => {
  useRoutineBuilderStore.getState().reset();
  useRoutineBuilderStore.setState({ hydrated: true });
  useRoutineCache.mockReturnValue({ routine: null, isLoading: false });
  createManualRoutine.mockClear();
  routerPush.mockClear();
  routerRefresh.mockClear();
});

describe("RoutineBuilderWizard", () => {
  it("toggling a day to rest disables the name field and fills in a name automatically", async () => {
    renderWizard();
    const user = userEvent.setup();

    const restSwitch = screen.getByRole("switch", { name: "Día de descanso" });
    expect(restSwitch).toHaveAttribute("aria-checked", "false");

    await user.click(restSwitch);

    expect(restSwitch).toHaveAttribute("aria-checked", "true");
    const nameInput = screen.getByRole("textbox", { name: /^Nombre del/ });
    expect(nameInput).toBeDisabled();
    expect(nameInput).toHaveValue("Día de descanso");
  });

  it("adds a custom exercise, edits its fields, reorders and removes it", async () => {
    renderWizard();
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Agregar ejercicio" }));
    await user.click(screen.getByRole("button", { name: "Ejercicio personalizado" }));

    const nameField = screen.getByPlaceholderText("—");
    await user.type(nameField, "Sentadilla");
    expect(nameField).toHaveValue("Sentadilla");

    await user.type(screen.getByRole("textbox", { name: "Series" }), "5");
    await user.type(screen.getByRole("textbox", { name: "Reps" }), "5");
    await user.type(screen.getByRole("textbox", { name: "Peso (kg)" }), "100");
    await user.type(screen.getByRole("textbox", { name: "Descanso (s)" }), "180");

    const draftBefore = useRoutineBuilderStore.getState().draft;
    expect(draftBefore.weeks[0].days[0].exercises[0]).toMatchObject({
      name: "Sentadilla",
      sets: 5,
      reps: "5",
      weight_kg: "100",
      rest_seconds: 180,
    });

    // Add a second exercise so reordering is meaningful, then move the first one down.
    await user.click(screen.getByRole("button", { name: "Agregar ejercicio" }));
    await user.click(screen.getByRole("button", { name: "Ejercicio personalizado" }));

    await user.click(screen.getByRole("button", { name: "Bajar Sentadilla" }));
    const afterMove = useRoutineBuilderStore.getState().draft.weeks[0].days[0].exercises;
    expect(afterMove[1].name).toBe("Sentadilla");

    await user.click(screen.getAllByRole("button", { name: /^Quitar/ })[1]);
    expect(useRoutineBuilderStore.getState().draft.weeks[0].days[0].exercises).toHaveLength(1);
  });

  it("shows validation errors and jumps to the offending week on save", async () => {
    renderWizard();
    const user = userEvent.setup();

    // Week 1's only day has no name and no exercises: saving should block and explain why.
    await user.click(screen.getByRole("button", { name: "Guardar rutina" }));

    expect(screen.getByText("Revisa antes de guardar")).toBeInTheDocument();
    expect(createManualRoutine).not.toHaveBeenCalled();
  });

  it("saves successfully once the draft is valid", async () => {
    const saved = { id: "new-routine" } as Routine;
    createManualRoutine.mockResolvedValue(saved);
    renderWizard();
    const user = userEvent.setup();

    await user.type(screen.getByRole("textbox", { name: /^Nombre del/ }), "Empuje");
    await user.click(screen.getByRole("button", { name: "Agregar ejercicio" }));
    await user.click(screen.getByRole("button", { name: "Ejercicio personalizado" }));
    await user.type(screen.getByPlaceholderText("—"), "Press de banca");

    await user.click(screen.getByRole("button", { name: "Guardar rutina" }));

    expect(createManualRoutine).toHaveBeenCalledTimes(1);
  });

  it("only shows the selected week's days", async () => {
    renderWizard();
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Agregar semana" }));
    expect(screen.getByRole("button", { name: "Semana 2" })).toBeInTheDocument();

    const week1Name = screen.getByRole("textbox", { name: /^Nombre del/ });
    await user.type(week1Name, "Semana uno día uno");

    await user.click(screen.getByRole("button", { name: "Semana 2" }));
    const week2Name = screen.getByRole("textbox", { name: /^Nombre del/ });
    expect(week2Name).not.toHaveValue("Semana uno día uno");
  });
});
