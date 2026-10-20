import { describe, expect, it } from "vitest";

import { heatLevel, setsByZone, zoneForMuscle } from "@/lib/muscleMap";

describe("zoneForMuscle", () => {
  it("understands the real dataset values, ignoring case and accents", () => {
    // server/apps/routines/data/exercises_db_v2.json primary_muscles/secondary_muscles.
    expect(zoneForMuscle("pectorals")).toBe("chest");
    expect(zoneForMuscle("delts")).toBe("deltoids");
    expect(zoneForMuscle("traps")).toBe("trapezius");
    expect(zoneForMuscle("levator scapulae")).toBe("trapezius");
    expect(zoneForMuscle("lats")).toBe("upperBack");
    expect(zoneForMuscle("back")).toBe("upperBack");
    expect(zoneForMuscle("latissimus dorsi")).toBe("upperBack");
    expect(zoneForMuscle("rhomboids")).toBe("upperBack");
    expect(zoneForMuscle("spine")).toBe("lowerBack");
    expect(zoneForMuscle("lower back")).toBe("lowerBack");
    expect(zoneForMuscle("serratus anterior")).toBe("serratus");
    expect(zoneForMuscle("brachialis")).toBe("biceps");
    expect(zoneForMuscle("grip muscles")).toBe("forearms");
    expect(zoneForMuscle("wrist flexors")).toBe("forearms");
    expect(zoneForMuscle("core")).toBe("abs");
    expect(zoneForMuscle("lower abs")).toBe("abs");
    expect(zoneForMuscle("obliques")).toBe("obliques");
    expect(zoneForMuscle("abductors")).toBe("glutes");
    expect(zoneForMuscle("quads")).toBe("quads");
    expect(zoneForMuscle("quadriceps")).toBe("quads");
    expect(zoneForMuscle("groin")).toBe("adductors");
    expect(zoneForMuscle("inner thighs")).toBe("adductors");
    expect(zoneForMuscle("hip flexors")).toBe("hipFlexors");
    expect(zoneForMuscle("soleus")).toBe("calves");
    expect(zoneForMuscle("shins")).toBe("tibialis");
  });

  it("understands the Spanish names the AI coach can return, ignoring case and accents", () => {
    expect(zoneForMuscle("Pectoral")).toBe("chest");
    expect(zoneForMuscle("Cuádriceps")).toBe("quads");
    expect(zoneForMuscle("Cuadriceps")).toBe("quads");
    expect(zoneForMuscle("Glúteo")).toBe("glutes");
    expect(zoneForMuscle("Deltoides")).toBe("deltoids");
    expect(zoneForMuscle("Femoral")).toBe("hamstrings");
    expect(zoneForMuscle("Gemelos")).toBe("calves");
    expect(zoneForMuscle("Abdominales")).toBe("abs");
    expect(zoneForMuscle("Oblicuos")).toBe("obliques");
    expect(zoneForMuscle("Trapecio")).toBe("trapezius");
    expect(zoneForMuscle("Espalda baja")).toBe("lowerBack");
    expect(zoneForMuscle("  ABS ")).toBe("abs");
  });

  it("splits what used to be one 'back' zone into trapezius / upper back / lower back", () => {
    expect(zoneForMuscle("traps")).toBe("trapezius");
    expect(zoneForMuscle("lats")).toBe("upperBack");
    expect(zoneForMuscle("spine")).toBe("lowerBack");
  });

  it("returns null for names it can't draw (cardio, hands, feet...)", () => {
    expect(zoneForMuscle("cardiovascular system")).toBeNull();
    expect(zoneForMuscle("ankles")).toBeNull();
    expect(zoneForMuscle("hands")).toBeNull();
    expect(zoneForMuscle("feet")).toBeNull();
    expect(zoneForMuscle("sternocleidomastoid")).toBeNull();
    expect(zoneForMuscle("")).toBeNull();
  });
});

describe("setsByZone", () => {
  it("adds up muscles that share a zone and skips unknown ones", () => {
    expect(
      setsByZone([
        { muscle: "lats", sets: 4 },
        { muscle: "back", sets: 3 },
        { muscle: "chest", sets: 5 },
        { muscle: "mystery", sets: 9 },
      ]),
    ).toEqual({ upperBack: 7, chest: 5 });
  });
});

describe("heatLevel", () => {
  it("scales relative to the busiest zone, over 4 levels, and never rounds a worked zone down to nothing", () => {
    expect(heatLevel(0, 10)).toBe(0);
    expect(heatLevel(10, 10)).toBe(4);
    expect(heatLevel(5, 10)).toBe(2);
    expect(heatLevel(1, 100)).toBe(1);
    expect(heatLevel(3, 0)).toBe(0);
  });
});
