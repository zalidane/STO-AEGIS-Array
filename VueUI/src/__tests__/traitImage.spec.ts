import { describe, expect, it } from "vitest";
import {
  FALLBACK_TRAIT_IMAGE,
  TRAIT_ICON_FEATURED_HEIGHT,
  TRAIT_ICON_FEATURED_WIDTH,
  TRAIT_ICON_NATIVE_HEIGHT,
  TRAIT_ICON_NATIVE_WIDTH,
  resolveTraitArtSrc,
} from "@/utils/traitImage";

describe("trait icon featured size", () => {
  it("is an integer 2x of the native 49x64 wiki icon", () => {
    expect(TRAIT_ICON_NATIVE_WIDTH).toBe(49);
    expect(TRAIT_ICON_NATIVE_HEIGHT).toBe(64);
    expect(TRAIT_ICON_FEATURED_WIDTH).toBe(98);
    expect(TRAIT_ICON_FEATURED_HEIGHT).toBe(128);
  });
});

describe("resolveTraitArtSrc", () => {
  it("prefers the extracted wiki icon over the placeholder", () => {
    expect(
      resolveTraitArtSrc(
        "/images/traits/Arrest_icon.png",
        FALLBACK_TRAIT_IMAGE,
      ),
    ).toBe("/images/traits/Arrest_icon.png");
  });

  it("uses the placeholder when the item has no image", () => {
    expect(resolveTraitArtSrc(null, FALLBACK_TRAIT_IMAGE)).toBe(
      FALLBACK_TRAIT_IMAGE,
    );
    expect(resolveTraitArtSrc("  ", FALLBACK_TRAIT_IMAGE)).toBe(
      FALLBACK_TRAIT_IMAGE,
    );
  });

  it("falls back after a load error", () => {
    expect(
      resolveTraitArtSrc(
        "/images/traits/Missing_icon.png",
        FALLBACK_TRAIT_IMAGE,
        true,
      ),
    ).toBe(FALLBACK_TRAIT_IMAGE);
  });
});
