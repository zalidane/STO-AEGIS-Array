import { describe, expect, it } from "vitest";
import {
  getItemImageUrl,
  getTraitImageUrl,
  wikiIconFilename,
  wikiLocalFilename,
} from "@/utils/wikiImage";

describe("wikiImage", () => {
  it("turns wiki File titles into local public filenames", () => {
    expect(wikiLocalFilename("File:Fed Ship Achilles.png")).toBe(
      "Fed_Ship_Achilles.png",
    );
  });

  it("appends icon.png for catalog names", () => {
    expect(wikiIconFilename("Phaser Beam Array")).toBe(
      "Phaser_Beam_Array_icon.png",
    );
    expect(wikiIconFilename("Adaptive Defense (space)")).toBe(
      "Adaptive_Defense_(space)_icon.png",
    );
  });

  it("builds item and trait public paths from stored filenames or names", () => {
    expect(getItemImageUrl("Phaser_Beam_Array_icon.png")).toBe(
      "/images/items/Phaser_Beam_Array_icon.png",
    );
    expect(getItemImageUrl(null, "Phaser Beam Array")).toBe(
      "/images/items/Phaser_Beam_Array_icon.png",
    );
    expect(getTraitImageUrl("A Good Day to Die", null)).toBe(
      "/images/traits/A_Good_Day_to_Die_icon.png",
    );
    expect(getTraitImageUrl("Adaptive Defense", "Adaptive Defense (space)")).toBe(
      "/images/traits/Adaptive_Defense_(space)_icon.png",
    );
  });
});
