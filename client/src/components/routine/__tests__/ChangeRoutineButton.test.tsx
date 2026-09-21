import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { beforeEach, describe, expect, it, vi } from "vitest";

import es from "@/messages/es.json";

const deactivateRoutine = vi.fn();
vi.mock("@/lib/api/routines", () => ({ deactivateRoutine: (...args: unknown[]) => deactivateRoutine(...args) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));

const { ChangeRoutineButton } = await import("../ChangeRoutineButton");

function renderButton() {
  return render(
    <NextIntlClientProvider locale="es" messages={es}>
      <ChangeRoutineButton routineId="r1" />
    </NextIntlClientProvider>,
  );
}

beforeEach(() => deactivateRoutine.mockReset());

describe("ChangeRoutineButton", () => {
  it("asks for confirmation in an alert dialog before doing anything", async () => {
    renderButton();
    await userEvent.click(screen.getByRole("button", { name: /Cambiar de rutina/ }));

    const dialog = screen.getByRole("alertdialog", { name: "¿Cambiar tu rutina?" });
    expect(dialog).toHaveAccessibleDescription(/Tu rutina actual se archivará/);
    expect(deactivateRoutine).not.toHaveBeenCalled();
  });

  it("cancelling and Escape close it without deactivating", async () => {
    renderButton();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /Cambiar de rutina/ }));
    await user.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(screen.queryByRole("alertdialog")).toBeNull();

    await user.click(screen.getByRole("button", { name: /Cambiar de rutina/ }));
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(deactivateRoutine).not.toHaveBeenCalled();
  });

  it("confirming deactivates the routine", async () => {
    deactivateRoutine.mockResolvedValue(undefined);
    renderButton();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /Cambiar de rutina/ }));
    await user.click(screen.getByRole("button", { name: "Archivar y continuar" }));

    expect(deactivateRoutine).toHaveBeenCalledWith("r1");
  });
});
