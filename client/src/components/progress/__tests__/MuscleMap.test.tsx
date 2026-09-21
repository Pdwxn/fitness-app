import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { MuscleMap } from "../MuscleMap";

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
  it("draws a front and a back figure with a key", () => {
    renderMap({ chest: 4 });
    expect(screen.getByRole("img", { name: "Frontal" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Trasera" })).toBeInTheDocument();
    expect(screen.getByText("Menos")).toBeInTheDocument();
    expect(screen.getByText("Más series")).toBeInTheDocument();
  });

  it("shades a worked zone brighter than an unworked one and names its sets", () => {
    const { container } = renderMap({ chest: 10, quads: 2 });
    const fills = (zoneTitle: string) =>
      [...container.querySelectorAll("title")]
        .filter((node) => node.textContent === zoneTitle)
        .map((node) => node.closest("g")!.getAttribute("fill"));

    expect(fills("chest · 10 series")[0]).toBe("rgba(166,255,0,0.95)");
    expect(fills("quads · 2 series")[0]).toBe("rgba(166,255,0,0.35)");
    expect(fills("abs · 0 series")[0]).toBe("rgba(255,255,255,0.05)");
  });
});
