import { act, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import es from "@/messages/es.json";

let pendingCount = 0;
vi.mock("dexie-react-hooks", () => ({ useLiveQuery: () => pendingCount }));
vi.mock("@/lib/db", () => ({ db: { pendingSync: { count: () => Promise.resolve(pendingCount) } } }));

const { ConnectionBanner } = await import("../ConnectionBanner");

function setOnline(value: boolean) {
  Object.defineProperty(navigator, "onLine", { configurable: true, value });
}

function renderBanner() {
  return render(
    <NextIntlClientProvider locale="es" messages={es}>
      <ConnectionBanner />
    </NextIntlClientProvider>,
  );
}

beforeEach(() => {
  pendingCount = 0;
  setOnline(true);
});
afterEach(() => setOnline(true));

describe("ConnectionBanner", () => {
  it("shows nothing when online with nothing waiting", () => {
    const { container } = renderBanner();
    expect(container).toBeEmptyDOMElement();
  });

  it("says so when offline, and updates when the connection changes", () => {
    setOnline(false);
    renderBanner();
    expect(screen.getByRole("status")).toHaveTextContent("Sin conexión. Estás usando datos guardados");

    act(() => {
      setOnline(true);
      window.dispatchEvent(new Event("online"));
    });
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("counts what is still waiting to sync once back online", () => {
    pendingCount = 3;
    renderBanner();
    expect(screen.getByRole("status")).toHaveTextContent("3 pendientes por sincronizar");
  });

  it("uses the singular for one", () => {
    pendingCount = 1;
    renderBanner();
    expect(screen.getByRole("status")).toHaveTextContent("1 pendiente por sincronizar");
  });
});
