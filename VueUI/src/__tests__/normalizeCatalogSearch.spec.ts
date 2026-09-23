import { describe, expect, it } from "vitest";
import { normalizeCatalogSearchText } from "@/utils/normalizeCatalogSearch";

describe("normalizeCatalogSearchText", () => {
  it("treats nullish and blank values as empty", () => {
    expect(normalizeCatalogSearchText(null)).toBe("");
    expect(normalizeCatalogSearchText(undefined)).toBe("");
    expect(normalizeCatalogSearchText("   ")).toBe("");
  });

  it("folds apostrophe variants and HTML entities for Jem'Hadar", () => {
    const straight = normalizeCatalogSearchText("Jem'Hadar");
    expect(normalizeCatalogSearchText("Jem’Hadar")).toBe(straight);
    expect(normalizeCatalogSearchText("Jem&#039;Hadar")).toBe(straight);
    expect(normalizeCatalogSearchText("Jem&apos;Hadar")).toBe(straight);
    expect(normalizeCatalogSearchText("jemhadar")).toBe(straight);
    expect(normalizeCatalogSearchText("JEM'HADAR")).toBe(straight);
  });
});
