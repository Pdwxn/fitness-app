import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { beforeEach, describe, expect, it, vi } from "vitest";

import es from "@/messages/es.json";

const signInWithPassword = vi.fn();
const signUp = vi.fn();
const signInWithOAuth = vi.fn();
const routerPush = vi.fn();

vi.mock("@/lib/supabase/client", () => ({
  createSupabaseBrowserClient: () => ({ auth: { signInWithPassword, signUp, signInWithOAuth } }),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: routerPush, refresh: vi.fn() }) }));

const { LoginForm } = await import("../LoginForm");
const { RegisterForm } = await import("../RegisterForm");

function renderWithIntl(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="es" messages={es}>
      {ui}
    </NextIntlClientProvider>,
  );
}

beforeEach(() => {
  signInWithPassword.mockReset();
  signUp.mockReset();
  routerPush.mockReset();
});

describe("LoginForm", () => {
  it("signs in and goes to the dashboard", async () => {
    signInWithPassword.mockResolvedValue({ error: null });
    renderWithIntl(<LoginForm locale="es" />);
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("Correo"), "a@b.co");
    await user.type(screen.getByLabelText("Contraseña"), "secret123");
    await user.click(screen.getByRole("button", { name: /Iniciar sesión/ }));

    expect(signInWithPassword).toHaveBeenCalledWith({ email: "a@b.co", password: "secret123" });
    expect(routerPush).toHaveBeenCalledWith("/es/dashboard");
  });

  it("shows the error under the password field", async () => {
    signInWithPassword.mockResolvedValue({ error: { message: "Invalid login credentials" } });
    renderWithIntl(<LoginForm locale="es" />);
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("Correo"), "a@b.co");
    await user.type(screen.getByLabelText("Contraseña"), "nope");
    await user.click(screen.getByRole("button", { name: /Iniciar sesión/ }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Invalid login credentials");
    expect(screen.getByLabelText("Contraseña")).toBeInvalid();
    expect(routerPush).not.toHaveBeenCalled();
  });

  it("toggles password visibility", async () => {
    renderWithIntl(<LoginForm locale="es" />);
    const user = userEvent.setup();
    const password = screen.getByLabelText("Contraseña");

    expect(password).toHaveAttribute("type", "password");
    await user.click(screen.getByRole("button", { name: "Mostrar contraseña" }));
    expect(password).toHaveAttribute("type", "text");
    await user.click(screen.getByRole("button", { name: "Ocultar contraseña" }));
    expect(password).toHaveAttribute("type", "password");
  });
});

describe("RegisterForm", () => {
  async function fill(user: ReturnType<typeof userEvent.setup>, confirm: string) {
    await user.type(screen.getByLabelText("Correo"), "a@b.co");
    await user.type(screen.getByLabelText("Contraseña"), "secret123");
    await user.type(screen.getByLabelText("Confirmar contraseña"), confirm);
    await user.click(screen.getByRole("button", { name: /Crear cuenta/ }));
  }

  it("flags mismatching passwords on the confirm field without calling the API", async () => {
    renderWithIntl(<RegisterForm locale="es" />);
    await fill(userEvent.setup(), "different1");

    expect(await screen.findByRole("alert")).toHaveTextContent("Las contraseñas no coinciden.");
    expect(screen.getByLabelText("Confirmar contraseña")).toBeInvalid();
    expect(signUp).not.toHaveBeenCalled();
  });

  it("goes straight to the dashboard when signing up returns a session", async () => {
    signUp.mockResolvedValue({ data: { session: {} }, error: null });
    renderWithIntl(<RegisterForm locale="es" />);
    await fill(userEvent.setup(), "secret123");

    expect(routerPush).toHaveBeenCalledWith("/es/dashboard");
  });

  it("replaces the form with a confirmation message when the email needs confirming", async () => {
    signUp.mockResolvedValue({ data: { session: null }, error: null });
    renderWithIntl(<RegisterForm locale="es" />);
    await fill(userEvent.setup(), "secret123");

    expect(await screen.findByRole("status")).toHaveTextContent("Revisa tu correo");
    expect(screen.queryByLabelText("Correo")).toBeNull();
    expect(screen.getByRole("link", { name: /Iniciar sesión/ })).toHaveAttribute("href", "/es/auth/login");
  });
});
