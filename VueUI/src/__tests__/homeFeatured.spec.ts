import { describe, expect, it } from "vitest";
import {
  buildHomeSectionCards,
  formatCatalogCount,
  keepOrPickRandom,
  pickRandomItem,
} from "@/logic/homeFeatured";

describe("formatCatalogCount", () => {
  it("uses a loading label when the count is unknown", () => {
    expect(formatCatalogCount(null, "vessel", "vessels")).toBe("Loading…");
  });

  it("uses singular and plural nouns", () => {
    expect(formatCatalogCount(1, "trait", "traits")).toBe("1 trait");
    expect(formatCatalogCount(12, "trait", "traits")).toBe("12 traits");
  });
});

describe("buildHomeSectionCards", () => {
  it("attaches counts and labels for the three catalog sections", () => {
    const cards = buildHomeSectionCards({
      ships: 40,
      traits: 1,
      starshipTraits: null,
    });

    expect(cards.map((card) => card.key)).toEqual([
      "ships",
      "traits",
      "starshipTraits",
    ]);
    expect(cards[0]?.countLabel).toBe("40 vessels");
    expect(cards[1]?.countLabel).toBe("1 trait");
    expect(cards[2]?.countLabel).toBe("Loading…");
    expect(cards[0]?.to).toBe("/ships");
  });
});

describe("pickRandomItem", () => {
  it("returns null for an empty list", () => {
    expect(pickRandomItem([])).toBeNull();
  });

  it("maps a unit interval onto list indexes", () => {
    const items = ["a", "b", "c"];
    expect(pickRandomItem(items, () => 0)).toBe("a");
    expect(pickRandomItem(items, () => 0.34)).toBe("b");
    expect(pickRandomItem(items, () => 0.99)).toBe("c");
  });

  it("clamps a random value of 1 to the last item", () => {
    expect(pickRandomItem(["a", "b"], () => 1)).toBe("b");
  });
});

describe("keepOrPickRandom", () => {
  it("keeps a previously chosen item", () => {
    expect(keepOrPickRandom("kept", ["a", "b"], () => 0.9)).toBe("kept");
  });

  it("picks once the list is populated", () => {
    expect(keepOrPickRandom(null, ["a", "b"], () => 0.9)).toBe("b");
  });
});
