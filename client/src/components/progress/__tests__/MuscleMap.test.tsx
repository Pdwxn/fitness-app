import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { BodyFigures, BodyGender } from "../bodyShapes";

const useBodyVariant = vi.fn<() => BodyGender>(() => "male");
vi.mock("@/hooks/useBodyVariant", () => ({ useBodyVariant: () => useBodyVariant() }));

const fixture: BodyFigures = {
  male: {
    front: {
      viewBox: "0 0 10 10",
      inert: ["M0 0 L1 1Z"],
      parts: [
        { zone: "chest", paths: ["M1 1 L2 2Z"] },
        { zone: "quads", paths: ["M3 3 L4 4Z"] },
      ],
    },
    back: {
      viewBox: "0 0 10 10",
      inert: ["M0 0 L1 1Z"],
      parts: [{ zone: "upperBack", paths: ["M5 5 L6 6Z"] }],
    },
  },
  female: {
    front: {
      viewBox: "0 0 9 9",
      inert: [],
      parts: [{ zone: "chest", paths: ["M1 1 L2 2Z M1 1 L2 3Z"] }],
    },
    back: { viewBox: "0 0 9 9", inert: [], parts: [{ zone: "upperBack", paths: ["M5 5 L6 6Z"] }] },
  },
};
vi.mock("../bodyShapes", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../bodyShapes")>()),
  loadBodyFigures: () => Promise.resolve(fixture),
}));

const { MuscleMap } = await import("../MuscleMap");

function renderMap(sets: Parameters<typeof MuscleMap>[0]["sets"]) {
  return render(
    <MuscleMap
      sets={sets}
      frontLabel="Frontal"
      backLabel="Trasera"
      lessLabel="Menos"
      moreLabel="Más series"
      zoneLabel={(zone) => zone}
      setsLabel={(count) => `${count} series`}
    />,
  );
}

describe("MuscleMap", () => {
  beforeEach(() => useBodyVariant.mockReturnValue("male"));

  it("draws a front and a back figure with a key, once the geometry has loaded", async () => {
    renderMap({ chest: 4 });
    expect(await screen.findByRole("img", { name: "Frontal" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Trasera" })).toBeInTheDocument();
    expect(screen.getByText("Menos")).toBeInTheDocument();
    expect(screen.getByText("Más series")).toBeInTheDocument();
  });

  it("shades the busiest zone red, a lighter zone yellow, and an untrained one gray", async () => {
    const { container } = renderMap({ chest: 10, quads: 2 });
    await screen.findByRole("img", { name: "Frontal" });

    const fillFor = (zoneTitle: string) =>
      [...container.querySelectorAll("title")]
        .filter((node) => node.textContent === zoneTitle)
        .map((node) => node.closest("g")!.getAttribute("fill"));

    expect(fillFor("chest · 10 series")[0]).toBe("#EF4444"); // busiest -> red
    expect(fillFor("quads · 2 series")[0]).toBe("#FDE68A"); // 2/10 -> rounds up to the lightest step
    expect(fillFor("upperBack · 0 series")[0]).toBe("rgba(255,255,255,0.14)"); // untrained -> gray
  });

  it("draws the female figure when told to", async () => {
    useBodyVariant.mockReturnValue("female");
    const { container } = renderMap({ chest: 1 });
    await screen.findByRole("img", { name: "Frontal" });

    expect(container.querySelector('svg[viewBox="0 0 9 9"]')).toBeInTheDocument();
  });
});
