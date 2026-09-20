import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it } from "vitest";

import en from "@/messages/en.json";
import es from "@/messages/es.json";

import { ExerciseMedia } from "../ExerciseMedia";

const IMAGE = "https://cdn.example.com/images/bench.jpg";
const DEMO = "https://cdn.example.com/videos/bench.gif";

function renderMedia(props: Partial<React.ComponentProps<typeof ExerciseMedia>> = {}, locale: "es" | "en" = "es") {
  return render(
    <NextIntlClientProvider locale={locale} messages={locale === "es" ? es : en}>
      <ExerciseMedia name="Press de banca" imageUrl={IMAGE} demoUrl={DEMO} {...props} />
    </NextIntlClientProvider>,
  );
}

describe("ExerciseMedia", () => {
  it("shows the still image and does not load the gif until asked", () => {
    renderMedia();
    expect(screen.getByRole("img", { name: "Press de banca" })).toHaveAttribute("src", IMAGE);
    expect(document.querySelector(`img[src="${DEMO}"]`)).toBeNull();
    expect(screen.getByRole("button", { name: "▶ Ver demo" })).toHaveAttribute("aria-pressed", "false");
  });

  it("swaps to the gif in place (no navigation, no new tab) and back", async () => {
    renderMedia();

    await userEvent.click(screen.getByRole("button", { name: "▶ Ver demo" }));

    const gif = screen.getByRole("img", { name: "Demostración de Press de banca" });
    expect(gif).toHaveAttribute("src", DEMO);
    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.getByRole("status")).toHaveTextContent("Cargando demo...");
    fireEvent.load(gif);
    expect(screen.queryByRole("status")).toBeNull();

    const stop = screen.getByRole("button", { name: "■ Detener demo" });
    expect(stop).toHaveAttribute("aria-pressed", "true");
    await userEvent.click(stop);
    expect(screen.getByRole("img", { name: "Press de banca" })).toHaveAttribute("src", IMAGE);
  });

  it("falls back to the still with a message when the demo can't load, and retries on the next tap", async () => {
    renderMedia();
    await userEvent.click(screen.getByRole("button", { name: "▶ Ver demo" }));
    fireEvent.error(screen.getByRole("img", { name: "Demostración de Press de banca" }));

    expect(screen.getByRole("alert")).toHaveTextContent("No se pudo cargar la demo");
    expect(screen.getByRole("img", { name: "Press de banca" })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "▶ Ver demo" }));
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.getByRole("img", { name: "Demostración de Press de banca" })).toBeInTheDocument();
  });

  it("has no button when there is no demo", () => {
    renderMedia({ demoUrl: "" });
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.getByRole("img", { name: "Press de banca" })).toBeInTheDocument();
  });

  it("still offers the demo when the still image is missing or broken", async () => {
    renderMedia({ imageUrl: "" });
    expect(screen.queryByRole("img")).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "▶ Ver demo" }));
    expect(screen.getByRole("img", { name: "Demostración de Press de banca" })).toBeInTheDocument();
  });

  it("renders nothing without any media", () => {
    const { container } = renderMedia({ imageUrl: "", demoUrl: "" });
    expect(container).toBeEmptyDOMElement();
  });

  it("is translated", () => {
    renderMedia({}, "en");
    expect(screen.getByRole("button", { name: "▶ Watch demo" })).toBeInTheDocument();
  });
});
