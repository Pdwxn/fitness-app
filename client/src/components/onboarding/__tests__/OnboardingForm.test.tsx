import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { beforeEach, describe, expect, it, vi } from "vitest";

import es from "@/messages/es.json";
import { useOnboardingStore } from "@/store/onboardingStore";

const authenticatedClientFetch = vi.fn();
const routerPush = vi.fn();

vi.mock("@/lib/api/authenticated-client", () => ({
  authenticatedClientFetch: (...args: unknown[]) => authenticatedClientFetch(...args),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: routerPush, refresh: vi.fn() }) }));

const { OnboardingForm } = await import("../OnboardingForm");

function renderForm() {
  return render(
    <NextIntlClientProvider locale="es" messages={es}>
      <OnboardingForm locale="es" />
    </NextIntlClientProvider>,
  );
}

const nextButton = () => screen.getByRole("button", { name: /Siguiente|Finalizar/ });

beforeEach(() => {
  localStorage.clear();
  useOnboardingStore.getState().reset();
  authenticatedClientFetch.mockReset();
  routerPush.mockReset();
  authenticatedClientFetch.mockImplementation(async (path: string) => {
    if (path.includes("status")) return { completed: false };
    return { completed: true, routine_generated: true, routine: { id: "r1" }, generation_error: null };
  });
});

describe("OnboardingForm", () => {
  it("starts on step 1 with the progress segments and no back button", async () => {
    renderForm();

    expect(await screen.findByRole("heading", { name: "Datos personales" })).toBeInTheDocument();
    expect(screen.getByText("Paso 1 de 6")).toBeInTheDocument();
    expect(screen.getByRole("list", { name: "Progreso del onboarding" })).toBeInTheDocument();
    expect(screen.getByText("Tu borrador se guarda en este dispositivo")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Anterior" })).toBeNull();
  });

  it("flags each empty field on step 1 instead of advancing", async () => {
    renderForm();
    const user = userEvent.setup();
    await screen.findByRole("heading", { name: "Datos personales" });

    await user.click(nextButton());

    expect(screen.getByText("Escribe tu nombre.")).toBeInTheDocument();
    expect(screen.getByText("Ingresa una edad válida.")).toBeInTheDocument();
    expect(screen.getByText("Ingresa tu peso.")).toBeInTheDocument();
    expect(screen.getByText("Ingresa tu altura.")).toBeInTheDocument();
    expect(screen.getByText("Paso 1 de 6")).toBeInTheDocument();
  });

  it("advances once step 1 is valid, and can go back", async () => {
    renderForm();
    const user = userEvent.setup();
    await screen.findByRole("heading", { name: "Datos personales" });

    await user.type(screen.getByLabelText("Nombre completo"), "Ana");
    await user.click(screen.getByRole("button", { name: "Mujer" }));
    await user.type(screen.getByLabelText("Edad"), "28");
    await user.type(screen.getByLabelText("Peso"), "60");
    await user.type(screen.getByLabelText("Altura"), "165");
    await user.click(nextButton());

    expect(await screen.findByRole("heading", { name: "Tu nivel de fitness" })).toBeInTheDocument();
    expect(screen.getByText("Paso 2 de 6")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Anterior" }));
    expect(await screen.findByRole("heading", { name: "Datos personales" })).toBeInTheDocument();
    expect(screen.getByLabelText("Nombre completo")).toHaveValue("Ana");
  });

  it("shows a generic message on later steps when something required is missing", async () => {
    useOnboardingStore.getState().setStep(2);
    renderForm();
    const user = userEvent.setup();
    await screen.findByRole("heading", { name: "Tu nivel de fitness" });

    await user.click(nextButton());

    expect(screen.getByRole("alert")).toHaveTextContent("Completa los campos requeridos antes de continuar.");
  });

  it("selects options with pressed state and only shows home equipment for 'Casa'", async () => {
    useOnboardingStore.getState().setStep(5);
    renderForm();
    const user = userEvent.setup();
    await screen.findByRole("heading", { name: "Tu equipo" });

    expect(screen.queryByText("Equipo disponible")).toBeNull();
    await user.click(screen.getByRole("button", { name: /Casa/ }));
    expect(screen.getByRole("button", { name: /Casa/ })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("Equipo disponible")).toBeInTheDocument();
  });

  it("submits on the last step and goes to the dashboard when a routine comes back", async () => {
    const store = useOnboardingStore.getState();
    store.updateProfile({ full_name: "Ana", gender: "female", age: 28, weight_kg: 60, height_cm: 165 });
    store.updateHealth({ days_per_week: 4, session_duration_minutes: 60, routine_type: "upper_lower" });
    store.setStep(6);
    renderForm();
    const user = userEvent.setup();
    await screen.findByRole("heading", { name: "Tu horario" });

    await user.click(screen.getByRole("button", { name: "Finalizar" }));

    await vi.waitFor(() => expect(routerPush).toHaveBeenCalledWith("/es/dashboard"));
    expect(authenticatedClientFetch).toHaveBeenCalledWith(
      "/api/v1/onboarding/complete/",
      expect.objectContaining({ method: "POST" }),
    );
  });
});
