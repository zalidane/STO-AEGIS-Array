import { describe, expect, it } from "vitest";
import {
  formatFactionsByFacSort,
  sortFactionsByFacSort,
} from "@/utils/sortFactionsByFacSort";

describe("sortFactionsByFacSort", () => {
  it("orders Fed / Romulan / Dominion by acd", () => {
    expect(
      sortFactionsByFacSort(
        "United Federation of Planets,Romulan Republic,Dominion",
        "acd",
      ),
    ).toEqual(["United Federation of Planets", "Romulan Republic", "Dominion"]);
  });

  it("orders cross-faction Cardassian-style lists by dcba", () => {
    expect(
      sortFactionsByFacSort(
        "United Federation of Planets,Klingon Empire,Romulan Republic,Dominion",
        "dcba",
      ),
    ).toEqual([
      "Dominion",
      "Romulan Republic",
      "Klingon Empire",
      "United Federation of Planets",
    ]);
  });

  it("returns split factions when facSort is missing", () => {
    expect(sortFactionsByFacSort("Romulan Republic,Dominion", null)).toEqual([
      "Romulan Republic",
      "Dominion",
    ]);
  });

  it("appends unmatched faction names after sorted ones", () => {
    expect(
      sortFactionsByFacSort(
        "United Federation of Planets,Cardassian Union,Dominion",
        "da",
      ),
    ).toEqual(["Dominion", "United Federation of Planets", "Cardassian Union"]);
  });
});

describe("formatFactionsByFacSort", () => {
  it("joins ordered factions for display", () => {
    expect(
      formatFactionsByFacSort(
        "United Federation of Planets,Romulan Republic,Dominion",
        "acd",
      ),
    ).toBe("United Federation of Planets, Romulan Republic, Dominion");
  });

  it("returns N/A for empty faction", () => {
    expect(formatFactionsByFacSort(null, "acd")).toBe("N/A");
  });
});
