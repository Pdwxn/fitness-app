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
