import { describe, expect, it } from "vitest";
import {
  bucketSearchHits,
  resolveSearchTab,
} from "@/logic/searchResults";

describe("bucketSearchHits", () => {
  it("groups by type in tab order and skips unknown types", () => {
    const buckets = bucketSearchHits([
      { type: "Trait", name: "Arrest", id: 2 },
      { type: "Infobox", name: "Sticky Web", id: 9 },
      { type: "Ship", name: "Achilles", id: 1 },
      { type: "Infobox", name: "Sticky Web", id: 9 },
      { type: "Mystery", name: "Nope", id: 3 },
    ]);
    expect(buckets.map((bucket) => bucket.type)).toEqual(["Ship", "Infobox", "Trait"]);
    expect(buckets[1]?.hits.map((hit) => hit.id)).toEqual([9]);
  });
});

describe("resolveSearchTab", () => {
  it("keeps the requested tab when it still has results", () => {
    expect(resolveSearchTab(["Ship", "Infobox"], "Infobox")).toBe("Infobox");
  });

  it("falls back to the first tab when the requested one is gone", () => {
    expect(resolveSearchTab(["Ship", "Trait"], "Infobox")).toBe("Ship");
    expect(resolveSearchTab([], "Infobox")).toBeNull();
  });
});
