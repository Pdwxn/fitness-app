import { describe, it, expect } from "vitest";
import { kgToLb, cmToFeetInches, formatWeight } from "../units";

describe("units", () => {
  it("should convert kg to lb", () => {
    expect(kgToLb(75)).toBeCloseTo(165.3, 1);
  });

  it("should convert cm to feet and inches", () => {
    const result = cmToFeetInches(175);
    expect(result.feet).toBe(5);
    expect(result.inches).toBe(9);
  });

  it("should format weight in metric", () => {
    const result = formatWeight(75, "metric");
    expect(result).toBe("75 kg");
  });

  it("should format weight in imperial", () => {
    const result = formatWeight(75, "imperial");
    expect(result).toBe("165.3 lb");
  });
});

import { displayToKg, formatWeightLabel, incrementLbFor, kgToDisplay, lbToKg, weightUnitFor } from "../units";

describe("weight units", () => {
  it("picks the weight unit from the unit system", () => {
    expect(weightUnitFor("metric")).toBe("kg");
    expect(weightUnitFor("imperial")).toBe("lb");
  });

  it("shows kg amounts in the chosen unit without trailing zeros", () => {
    expect(kgToDisplay("60.00", "kg")).toBe("60");
    expect(kgToDisplay("62.5", "kg")).toBe("62.5");
    expect(kgToDisplay(60, "lb")).toBe("132.3");
    expect(kgToDisplay(null, "lb")).toBe("");
    expect(kgToDisplay("", "kg")).toBe("");
  });

  it("round-trips whole pounds without drifting (135 lb stays 135)", () => {
    for (const lb of [45, 95, 135, 185, 225, 315]) {
      expect(kgToDisplay(displayToKg(String(lb), "lb"), "lb")).toBe(String(lb));
    }
    expect(lbToKg(135)).toBe(61.24);
  });

  it("passes kg text through and leaves unparseable text for the validators", () => {
    expect(displayToKg("62,5", "kg")).toBe("62,5");
    expect(displayToKg("", "lb")).toBe("");
    expect(displayToKg("12.", "lb")).toBe("5.44");
    expect(displayToKg("abc", "lb")).toBe("abc");
  });

  it("labels a weight with its unit", () => {
    expect(formatWeightLabel("80", "kg")).toBe("80 kg");
    expect(formatWeightLabel("80", "lb")).toBe("176.4 lb");
    expect(formatWeightLabel(null, "kg")).toBe("");
  });

  it("re-expresses progression jumps in plate-sized pounds", () => {
    expect(incrementLbFor(2.5)).toBe(5);
    expect(incrementLbFor(2)).toBe(5);
    expect(incrementLbFor(5)).toBe(10);
    expect(incrementLbFor(1)).toBe(2.5);
  });
});
