import { describe, expect, it } from "vitest";
import {
  catalogTabEmptyMessage,
  countFacetMatches,
  defaultRegionKey,
  facetKey,
  facetLabel,
  listFacetKeys,
  UNSPECIFIED_FACET,
} from "@/logic/catalogBrowserTabs";

const skills = [
  { type: "Pilot", environment: "Space" },
  { type: "Tactical", environment: "Space" },
  { type: "Tactical", environment: "Ground" },
  { type: "Engineering", environment: null },
  { type: null, environment: "Ground" },
];

describe("catalog browser tabs", () => {
  it("lists type and region keys with unspecified last", () => {
    expect(listFacetKeys(skills, "type")).toEqual([
      "Engineering",
      "Pilot",
      "Tactical",
      UNSPECIFIED_FACET,
    ]);
    expect(listFacetKeys(skills, "environment")).toEqual([
      "Ground",
      "Space",
      UNSPECIFIED_FACET,
    ]);
    expect(facetLabel("type", UNSPECIFIED_FACET)).toBe("Unspecified");
    expect(facetLabel("environment", "space")).toBe("Space");
    expect(facetKey("  Space  ")).toBe("Space");
    expect(facetKey("  ")).toBe(UNSPECIFIED_FACET);
  });

  it("counts a type and region together, including empty combos", () => {
    expect(
      countFacetMatches(skills, { type: "Pilot", environment: "Space" }),
    ).toBe(1);
    expect(
      countFacetMatches(skills, { type: "Pilot", environment: "Ground" }),
    ).toBe(0);
    expect(
      countFacetMatches(skills, {
        type: "Engineering",
        environment: UNSPECIFIED_FACET,
      }),
    ).toBe(1);
  });

  it("defaults to a region that has skills for the selected type", () => {
    const regions = listFacetKeys(skills, "environment");
    expect(defaultRegionKey(skills, "Pilot", regions)).toBe("Space");
    expect(defaultRegionKey(skills, "Tactical", regions)).toBe("Ground");
    expect(defaultRegionKey(skills, "Missing", regions)).toBe("Ground");
  });

  it("describes an empty type and region combo", () => {
    expect(
      catalogTabEmptyMessage({
        noun: "skills",
        searching: false,
        typeLabel: "Pilot",
        regionLabel: "Ground",
      }),
    ).toBe("No skills in Pilot · Ground.");
    expect(
      catalogTabEmptyMessage({
        noun: "items",
        searching: false,
        typeLabel: "Ground Device",
      }),
    ).toBe("No items of type Ground Device.");
    expect(
      catalogTabEmptyMessage({
        noun: "skills",
        searching: true,
        typeLabel: "Pilot",
        regionLabel: "Ground",
      }),
    ).toBe("No results match the current search and filters.");
  });
});
