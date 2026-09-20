import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { beforeEach, describe, expect, it, vi } from "vitest";

import es from "@/messages/es.json";
import { makeFakeCaches } from "@/test/fakeCaches";
import type { Routine } from "@/types/routine";

const useRoutineCache = vi.fn();
vi.mock("@/hooks/useRoutineCache", () => ({ useRoutineCache: () => useRoutineCache() }));

const { OfflineMediaStatus } = await import("../OfflineMediaStatus");

const routine = {
  id: "r1",
  weeks: [
    {
      days: [
        {
          exercises: [
            { image_url: "https://cdn.example.com/a.jpg", video_url: "https://cdn.example.com/a.gif" },
            { image_url: "https://cdn.example.com/b.jpg", video_url: "" },
          ],
        },
      ],
    },
  ],
} as unknown as Routine;

function renderStatus() {
  return render(
    <NextIntlClientProvider locale="es" messages={es}>
      <OfflineMediaStatus />
    </NextIntlClientProvider>,
  );
}

beforeEach(() => {
  vi.stubGlobal("caches", makeFakeCaches());
  vi.stubGlobal("fetch", vi.fn(async () => new Response("bytes")));
  Object.defineProperty(navigator, "onLine", { value: true, configurable: true });
  useRoutineCache.mockReturnValue({ routine });
});

describe("OfflineMediaStatus", () => {
  it("renders nothing without a routine or media", () => {
    useRoutineCache.mockReturnValue({ routine: null });
    const { container } = renderStatus();
    expect(container).toBeEmptyDOMElement();
  });

  it("shows how many files are stored, downloads on demand, and can delete them", async () => {
    renderStatus();
    expect(await screen.findByText("0 de 3 archivos guardados")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Borrar copias" })).toBeNull();

    await userEvent.click(screen.getByRole("button", { name: "Descargar ahora" }));

    expect(await screen.findByText("Todo disponible sin conexión")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Borrar copias" }));
    expect(await screen.findByText("0 de 3 archivos guardados")).toBeInTheDocument();
  });

  it("tells the user when some files failed", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => (url.endsWith(".gif") ? new Response("x", { status: 404 }) : new Response("ok"))),
    );
    renderStatus();

    await userEvent.click(await screen.findByRole("button", { name: "Descargar ahora" }));

    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("1 archivo no se pudo descargar"));
  });

  it("explains when the browser can't store files", async () => {
    vi.stubGlobal("caches", undefined);
    renderStatus();
    expect(await screen.findByRole("status")).toHaveTextContent("no permite guardar archivos");
    expect(screen.queryByRole("button", { name: "Descargar ahora" })).toBeNull();
  });
});
