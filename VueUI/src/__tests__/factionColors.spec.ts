import { describe, expect, it } from "vitest";
import { getFactionColor, getFactionGlow } from "@/mappers/factionColors";

describe("getFactionGlow", () => {
  it("uses Dominion purple only for Dominion primary factions", () => {
    expect(getFactionGlow("Dominion")).toBe("#9c27b0");
  });

  it("does not use Dominion purple for Cross-Faction", () => {
    expect(getFactionGlow("Cross-Faction")).toBe("#c5d0da");
    expect(getFactionGlow("Cross-Faction")).not.toBe(getFactionGlow("Dominion"));
  });

  it("maps playable faction ledes to their accents", () => {
    expect(getFactionGlow("Federation")).toBe("#3fa7ff");
    expect(getFactionGlow("Klingon Empire")).toBe("#d32f2f");
    expect(getFactionGlow("Romulan Republic")).toBe("#00c853");
  });
});

describe("getFactionColor", () => {
  it("treats Cross-Faction as neutral, not Dominion", () => {
    expect(getFactionColor("Cross-Faction")).toBe("neutral");
    expect(getFactionColor("Dominion")).toBe("dominion");
  });
});
