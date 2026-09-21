import { describe, expect, it } from "vitest";

import { heatLevel, setsByZone, zoneForMuscle } from "@/lib/muscleMap";

describe("zoneForMuscle", () => {
  it("understands the English catalog and the Spanish AI names, ignoring case and accents", () => {
    expect(zoneForMuscle("chest")).toBe("chest");
    expect(zoneForMuscle("Pectoral")).toBe("chest");
    expect(zoneForMuscle("pectorals")).toBe("chest");
    expect(zoneForMuscle("Cuádriceps")).toBe("quads");
    expect(zoneForMuscle("Cuadriceps")).toBe("quads");
    expect(zoneForMuscle("Glúteo")).toBe("glutes");
    expect(zoneForMuscle("delts")).toBe("shoulders");
    expect(zoneForMuscle("Deltoides")).toBe("shoulders");
    expect(zoneForMuscle("Femoral")).toBe("hamstrings");
    expect(zoneForMuscle("Gemelos")).toBe("calves");
    expect(zoneForMuscle("Abdominales")).toBe("abs");
    expect(zoneForMuscle("  ABS ")).toBe("abs");
  });

  it("puts every back muscle on the back", () => {
    for (const name of ["lats", "Dorsal", "upper back", "traps", "lower back", "Espalda"]) {
      expect(zoneForMuscle(name)).toBe("back");
    }
  });

  it("returns null for names it doesn't know", () => {
    expect(zoneForMuscle("cardiovascular system")).toBeNull();
    expect(zoneForMuscle("")).toBeNull();
  });
});

describe("setsByZone", () => {
  it("adds up muscles that share a zone and skips unknown ones", () => {
    expect(
      setsByZone([
        { muscle: "lats", sets: 4 },
        { muscle: "Dorsal", sets: 3 },
        { muscle: "chest", sets: 5 },
        { muscle: "mystery", sets: 9 },
      ]),
    ).toEqual({ back: 7, chest: 5 });
  });
});

describe("heatLevel", () => {
  it("scales relative to the busiest zone and never rounds a worked zone down to nothing", () => {
    expect(heatLevel(0, 10)).toBe(0);
    expect(heatLevel(10, 10)).toBe(5);
    expect(heatLevel(5, 10)).toBe(3);
    expect(heatLevel(1, 100)).toBe(1);
    expect(heatLevel(3, 0)).toBe(0);
  });
});
