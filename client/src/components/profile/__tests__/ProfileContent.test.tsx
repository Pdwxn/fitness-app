import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { beforeEach, describe, expect, it, vi } from "vitest";

import es from "@/messages/es.json";

const authenticatedClientFetch = vi.fn();
const usePushSubscription = vi.fn();

vi.mock("@/lib/api/authenticated-client", () => ({
  authenticatedClientFetch: (...args: unknown[]) => authenticatedClientFetch(...args),
  ApiError: class ApiError extends Error {
    detail = "";
  },
}));
vi.mock("@/hooks/useRoutineCache", () => ({
  useRoutineCache: () => ({ routine: null, lastSync: 0, isLoading: false, hasError: false, isOfflineFallback: false }),
}));
vi.mock("@/hooks/useProgressStats", () => ({
  useProgressStats: () => ({ stats: { completed_days: 12, total_exercises_completed: 90, pending_sync: 0 } }),
}));
vi.mock("@/hooks/useDailyLogs", () => ({ useDailyLogs: () => ({ logs: [] }) }));
vi.mock("@/hooks/usePushSubscription", () => ({ usePushSubscription: () => usePushSubscription() }));
vi.mock("@/components/auth/LogoutButton", () => ({ LogoutButton: ({ label }: { label: string }) => <button>{label}</button> }));
const routerReplace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), replace: routerReplace }),
  usePathname: () => "/es/profile",
}));

const { ProfileContent } = await import("../ProfileContent");

const profileResponse = {
  id: "p1",
  full_name: "Ana Pérez",
  gender: "female",
  age: 28,
  weight_kg: 60,
  height_cm: 165,
  preferred_language: "es",
  preferred_units: "metric",
};
const healthResponse = {
  id: "h1",
  experience_level: "intermediate",
  activity_level: "moderate",
  physical_goals: [],
  training_style: "hypertrophy",
  priority_muscles: [],
  intensity_preference: "near_failure",
  specific_goal: "",
  medical_conditions: [],
  injuries: [],
  equipment_type: "gym",
  available_equipment: [],
  routine_type: "upper_lower",
  days_per_week: 4,
  session_duration_minutes: 60,
};

function renderProfile() {
  return render(
    <NextIntlClientProvider locale="es" messages={es}>
      <ProfileContent locale="es" />
    </NextIntlClientProvider>,
  );
}

beforeEach(() => {
  localStorage.clear();
  authenticatedClientFetch.mockReset();
  routerReplace.mockReset();
  authenticatedClientFetch.mockImplementation(async (path: string, init?: { method?: string; body?: string }) => {
    if (init?.method === "PUT") return JSON.parse(init.body ?? "{}");
    return path.includes("health") ? healthResponse : profileResponse;
  });
  usePushSubscription.mockReturnValue({ status: "available", busy: false, subscribe: vi.fn(), unsubscribe: vi.fn() });
});

describe("ProfileContent", () => {
  it("shows the person, their level and real totals", async () => {
    renderProfile();

    expect(await screen.findByRole("heading", { name: "Ana Pérez" })).toBeInTheDocument();
    // once in the header chip, once as the selected level below
    expect(screen.getAllByText("Intermedio")).toHaveLength(2);
    expect(screen.getByText("4 días")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("90")).toBeInTheDocument();
    expect(screen.getByText("Aún no tienes una rutina activa.")).toBeInTheDocument();
  });

  it("only enables save after a change, and saves only the section that changed", async () => {
    renderProfile();
    const user = userEvent.setup();
    await screen.findByRole("heading", { name: "Ana Pérez" });

    expect(screen.getByRole("button", { name: "Guardar" })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "English" }));
    await user.click(screen.getByRole("button", { name: "Guardar" }));

    expect(await screen.findByText("Cambios guardados.")).toBeInTheDocument();
    const puts = authenticatedClientFetch.mock.calls.filter(([, init]) => init?.method === "PUT");
    expect(puts).toHaveLength(1);
    expect(puts[0][0]).toBe("/api/v1/profile/");
    expect(JSON.parse(puts[0][1].body).preferred_language).toBe("en");
  });

  it("saves training preferences to the health endpoint", async () => {
    renderProfile();
    const user = userEvent.setup();
    await screen.findByRole("heading", { name: "Ana Pérez" });

    await user.click(screen.getByRole("button", { name: "Avanzado" }));
    await user.click(screen.getByRole("button", { name: "Guardar" }));

    await screen.findByText("Cambios guardados.");
    const puts = authenticatedClientFetch.mock.calls.filter(([, init]) => init?.method === "PUT");
    expect(puts.map(([path]) => path)).toEqual(["/api/v1/profile/health/"]);
    expect(JSON.parse(puts[0][1].body).experience_level).toBe("advanced");
  });

  it("explains a blocked-notifications state", async () => {
    usePushSubscription.mockReturnValue({ status: "denied", busy: false, subscribe: vi.fn(), unsubscribe: vi.fn() });
    renderProfile();
    await screen.findByRole("heading", { name: "Ana Pérez" });

    expect(screen.getByText("Bloqueados en el navegador")).toBeInTheDocument();
    expect(screen.getByRole("switch", { name: "Recordatorios" })).toBeDisabled();
    expect(screen.getByText(/bloqueadas en este navegador/)).toBeInTheDocument();
  });

  it("switches the interface language when the language setting is saved", async () => {
    renderProfile();
    const user = userEvent.setup();
    await screen.findByRole("heading", { name: "Ana Pérez" });

    await user.click(screen.getByRole("button", { name: "English" }));
    await user.click(screen.getByRole("button", { name: "Guardar" }));

    await screen.findByText("Cambios guardados.");
    expect(routerReplace).toHaveBeenCalledWith("/en/profile");
  });

  it("does not navigate when the language didn't change", async () => {
    renderProfile();
    const user = userEvent.setup();
    await screen.findByRole("heading", { name: "Ana Pérez" });

    await user.click(screen.getByRole("button", { name: "Imperial" }));
    await user.click(screen.getByRole("button", { name: "Guardar" }));

    await screen.findByText("Cambios guardados.");
    expect(routerReplace).not.toHaveBeenCalled();
  });

  it("shows weight and height in imperial units and saves them back in metric", async () => {
    renderProfile();
    const user = userEvent.setup();
    await screen.findByRole("heading", { name: "Ana Pérez" });

    expect(screen.getByLabelText("Peso")).toHaveValue(60);
    await user.click(screen.getByRole("button", { name: "Imperial" }));

    expect(screen.getByLabelText("Peso")).toHaveValue(132.3); // 60 kg
    expect(screen.getByLabelText("Altura (ft)")).toHaveValue(5); // 165 cm = 5 ft 5 in
    expect(screen.getByLabelText("Altura (in)")).toHaveValue(5);

    await user.click(screen.getByRole("button", { name: "Guardar" }));
    await screen.findByText("Cambios guardados.");
    const body = JSON.parse(authenticatedClientFetch.mock.calls.find(([, init]) => init?.method === "PUT")![1].body);
    expect(body).toMatchObject({ preferred_units: "imperial", weight_kg: 60, height_cm: 165 });
  });
});
