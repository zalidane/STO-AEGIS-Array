import { describe, expect, it } from "vitest";
import {
  factionMarkKey,
  resolvePrimaryFaction,
  resolveFactionThemeColor,
} from "@/logic/resolvePrimaryFaction";

describe("resolvePrimaryFaction", () => {
  it("prefers factionLede over faction/facSort", () => {
    expect(
      resolvePrimaryFaction({
        factionLede: "Cross-Faction",
        faction: "Dominion,United Federation of Planets",
        facSort: "da",
      }),
    ).toBe("Cross-Faction");
  });

  it("falls back to first facSort-ordered faction when lede is missing", () => {
    expect(
      resolvePrimaryFaction({
        factionLede: null,
        faction: "United Federation of Planets,Klingon Empire,Romulan Republic,Dominion",
        facSort: "dcba",
      }),
    ).toBe("Dominion");
  });

  it("maps lede to theme colors and mark keys", () => {
    expect(resolveFactionThemeColor({ factionLede: "Federation" })).toBe(
      "federation",
    );
    expect(resolveFactionThemeColor({ factionLede: "Cross-Faction" })).toBe(
      "neutral",
    );
    expect(factionMarkKey("Klingon Empire")).toBe("klingon");
    expect(factionMarkKey("Cross-Faction")).toBe("cross");
  });
});
