import { existsSync } from "node:fs";
import { join, resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { FALLBACK_SHIP_IMAGE } from "@/utils/shipImage";
import {
  FALLBACK_STARSHIP_TRAIT_IMAGE,
  FALLBACK_TRAIT_IMAGE,
} from "@/utils/traitImage";
import {
  DEFAULT_IMAGE_BASE_URL,
  getWikiImageUrl,
  resolveImageBase,
  wikiImagePublicUrl,
} from "@/utils/wikiImage";

const publicDir = [
  resolve(process.cwd(), "public"),
  resolve(process.cwd(), "VueUI/public"),
].find((dir) => existsSync(join(dir, "placeholders")));

if (!publicDir) {
  throw new Error(
    `Placeholder directory not found from cwd ${process.cwd()}`,
  );
}

describe("resolveImageBase", () => {
  it("falls back to /images when unset, blank, or whitespace", () => {
    expect(resolveImageBase(undefined)).toBe(DEFAULT_IMAGE_BASE_URL);
    expect(resolveImageBase(null)).toBe("/images");
    expect(resolveImageBase("")).toBe("/images");
    expect(resolveImageBase("   ")).toBe("/images");
  });

  it("strips trailing slashes from a configured origin", () => {
    expect(resolveImageBase("https://img.aegisarray.com/")).toBe(
      "https://img.aegisarray.com",
    );
    expect(resolveImageBase("https://img.aegisarray.com///")).toBe(
      "https://img.aegisarray.com",
    );
  });
});

describe("wikiImagePublicUrl", () => {
  it("joins the configured base, kind, and encoded filename", () => {
    expect(
      wikiImagePublicUrl(
        "ships",
        "Amarie_Smuggler's_Heavy_Escort.jpg",
        "https://img.aegisarray.com/",
      ),
    ).toBe(
      "https://img.aegisarray.com/ships/Amarie_Smuggler%27s_Heavy_Escort.jpg",
    );
  });

  it("keeps the local /images path when the base is unset", () => {
    expect(getWikiImageUrl("items", "Phaser_Beam_Array_icon.png", "/x")).toBe(
      "/images/items/Phaser_Beam_Array_icon.png",
    );
  });
});

describe("placeholder images", () => {
  it("resolve from public/placeholders, outside the wiki image folders", () => {
    expect(FALLBACK_SHIP_IMAGE).toBe("/placeholders/ship-placeholder.png");
    expect(FALLBACK_TRAIT_IMAGE).toBe("/placeholders/trait-placeholder.png");
    expect(FALLBACK_STARSHIP_TRAIT_IMAGE).toBe(
      "/placeholders/starship-trait-placeholder.png",
    );

    expect(
      existsSync(join(publicDir, "placeholders/ship-placeholder.png")),
    ).toBe(true);
    expect(
      existsSync(join(publicDir, "placeholders/trait-placeholder.png")),
    ).toBe(true);
    expect(
      existsSync(
        join(publicDir, "placeholders/starship-trait-placeholder.png"),
      ),
    ).toBe(true);
    expect(
      existsSync(join(publicDir, "images/ships/ship-placeholder.png")),
    ).toBe(false);
    expect(
      existsSync(join(publicDir, "images/traits/trait-placeholder.png")),
    ).toBe(false);
    expect(
      existsSync(
        join(
          publicDir,
          "images/starship-traits/starship-trait-placeholder.png",
        ),
      ),
    ).toBe(false);
  });
});
