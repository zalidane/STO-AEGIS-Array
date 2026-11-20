import { describe, expect, it } from "vitest";
import { normalizeTraitType } from "@/logic/traitType";
import { displayTraitType, mapPersonalTraitToBrowserItem } from "@/logic/traitBrowser";

describe("normalizeTraitType", () => {
  it("folds wiki free-text personal types into char", () => {
    expect(normalizeTraitType("Race (Space)")).toBe("char");
    expect(normalizeTraitType("Lock box (Space)")).toBe("char");
    expect(normalizeTraitType("Lockbox (Ground)")).toBe("char");
  });

  it("keeps Cargo codes and empties", () => {
    expect(normalizeTraitType("char")).toBe("char");
    expect(normalizeTraitType("boff")).toBe("boff");
    expect(normalizeTraitType("ActiveReputation")).toBe("activereputation");
    expect(normalizeTraitType("  ")).toBeNull();
    expect(normalizeTraitType(null)).toBeNull();
  });

  it("labels and groups them as Personal in the trait browser", () => {
    expect(displayTraitType("Race (Space)")).toBe("Personal");
    const item = mapPersonalTraitToBrowserItem({
      id: 1,
      name: "Astrophysicist",
      type: "Race (Space)",
      environment: "space",
      career: null,
      source: null,
      description: "Space Trait.",
      shortDescription: null,
      iconName: null,
    } as Parameters<typeof mapPersonalTraitToBrowserItem>[0]);
    expect(item.type).toBe("char");
  });
});
