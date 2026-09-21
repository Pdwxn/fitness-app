import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SearchX } from "lucide-react";
import { describe, expect, it, vi } from "vitest";

import { StatusCard } from "../StatusCard";
import { EmptyState, ErrorState } from "../states";

describe("state components", () => {
  it("ErrorState is an alert with a retry button", async () => {
    const onAction = vi.fn();
    render(<ErrorState title="No se pudo cargar" description="Revisa tu conexión" actionLabel="Reintentar" onAction={onAction} />);

    expect(screen.getByRole("alert")).toHaveTextContent("No se pudo cargar");
    await userEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it("ErrorState without an action has no button", () => {
    render(<ErrorState title="Fallo" />);
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("EmptyState is a status message", () => {
    render(<EmptyState icon={SearchX} title="Sin registros todavía" description="Tus entrenamientos aparecerán aquí." />);
    expect(screen.getByRole("status")).toHaveTextContent("Sin registros todavía");
  });

  it("StatusCard announces errors as alerts and everything else as status, with an optional action", async () => {
    const onClick = vi.fn();
    const { rerender } = render(<StatusCard message="Cargando" />);
    expect(screen.getByRole("status")).toHaveTextContent("Cargando");

    rerender(<StatusCard message="Falló" tone="error" action={{ label: "Reintentar", onClick }} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Falló");
    await userEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(onClick).toHaveBeenCalled();
  });
});
