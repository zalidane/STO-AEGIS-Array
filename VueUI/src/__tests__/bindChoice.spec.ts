import { describe, expect, it } from "vitest";
import {
  bindChoiceFromCost,
  bindChoiceFromGrantingShips,
  matchingBindChoiceConditions,
  SHIP_BIND_CHOICE_CONDITIONS,
} from "@/logic/collection/bindChoice";

describe("bindChoice conditions", () => {
  it("keeps cheap Zen-only and lockbox-only hulls off the picker", () => {
    expect(bindChoiceFromCost("3000;Zen").requiresChoice).toBe(false);
    expect(bindChoiceFromCost("1;LB").requiresChoice).toBe(false);
    expect(bindChoiceFromCost("800;LC").requiresChoice).toBe(false);
    expect(bindChoiceFromCost("200000;dil").requiresChoice).toBe(false);
  });

  it("matches Phoenix and Anniversary pack costs", () => {
    expect(bindChoiceFromCost("1;PPP5").conditionIds).toEqual([
      "phoenix-anniversary",
    ]);
    expect(bindChoiceFromCost("20;APP").conditionIds).toEqual([
      "phoenix-anniversary",
    ]);
  });

  it("matches a non-Zen path when Zen is also listed", () => {
    expect(bindChoiceFromCost("1;LB / 3000;Zen").conditionIds).toEqual([
      "non-zen-path",
    ]);
  });

  it("matches expensive Zen and both reasons on Kelvin-style listings", () => {
    expect(bindChoiceFromCost("20000;Zen").conditionIds).toEqual([
      "expensive-zen",
    ]);
    expect(bindChoiceFromCost("1;LB / 29500;Zen").conditionIds).toEqual([
      "non-zen-path",
      "expensive-zen",
    ]);
    expect(
      bindChoiceFromCost("12000;Zen", { displayPrefix: "Legendary" })
        .requiresChoice,
    ).toBe(false);
    expect(
      bindChoiceFromCost("12000;Zen", {
        name: "Legendary Akira Multi-Mission Command Cruiser",
      }).conditionIds,
    ).toEqual([]);
  });

  it("composes the collect prompt from matched conditions only", () => {
    const kelvin = bindChoiceFromCost("1;LB / 29500;Zen");
    expect(kelvin.prompt).toContain("method other than the Zen Store");
    expect(kelvin.prompt).toContain("over 10,000");
    expect(kelvin.prompt).not.toContain("Phoenix Token");

    const phoenix = bindChoiceFromCost("1;PPP5");
    expect(phoenix.prompt).toContain("Phoenix Token");
    expect(phoenix.prompt).not.toContain("over 10,000");
  });

  it("unions granting-ship conditions in list order", () => {
    const choice = bindChoiceFromGrantingShips([
      "1;PPP5",
      { cost: "12000;Zen", displayPrefix: "Legendary" },
      "20000;Zen",
    ]);
    expect(choice.conditionIds).toEqual([
      "phoenix-anniversary",
      "expensive-zen",
    ]);
  });

  it("exposes conditions as an append-only list", () => {
    const ids = SHIP_BIND_CHOICE_CONDITIONS.map((condition) => condition.id);
    expect(ids).toEqual([
      "phoenix-anniversary",
      "non-zen-path",
      "expensive-zen",
    ]);
    expect(matchingBindChoiceConditions(null)).toEqual([]);
  });
});
