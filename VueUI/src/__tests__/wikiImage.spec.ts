import { describe, expect, it } from "vitest";
import {
  getItemImageUrl,
  getTraitImageUrl,
  getWikiImageUrl,
  wikiIconFilename,
  wikiLocalFilename,
} from "@/utils/wikiImage";

describe("wikiImage", () => {
  it("turns wiki File titles into local public filenames", () => {
    expect(wikiLocalFilename("File:Fed Ship Achilles.png")).toBe(
      "Fed_Ship_Achilles.png",
    );
  });

  it("decodes HTML apostrophes and strips them from local filenames", () => {
    expect(
      wikiLocalFilename("File:Amarie Smuggler&#039;s Heavy Escort.jpg"),
    ).toBe("Amarie_Smugglers_Heavy_Escort.jpg");
    expect(wikiLocalFilename("File:Rom Ship T'liss Temporal.png")).toBe(
      "Rom_Ship_Tliss_Temporal.png",
    );
    expect(
      wikiLocalFilename("File:Son'a Collector Science Dreadnought.jpg"),
    ).toBe("Sona_Collector_Science_Dreadnought.jpg");
    expect(wikiLocalFilename("File:obeliskcarrier.jpg")).toBe(
      "obeliskcarrier.jpg",
    );
  });

  it("builds public image URLs without apostrophes", () => {
    expect(
      getWikiImageUrl(
        "ships",
        "File:Amarie Smuggler&#039;s Heavy Escort.jpg",
        "/images/ships/ship-placeholder.png",
      ),
    ).toBe("/images/ships/Amarie_Smugglers_Heavy_Escort.jpg");
    expect(
      getWikiImageUrl(
        "ships",
        "File:Rom Ship T'liss Temporal.png",
        "/images/ships/ship-placeholder.png",
      ),
    ).toBe("/images/ships/Rom_Ship_Tliss_Temporal.png");
    expect(
      getWikiImageUrl(
        "ships",
        "File:Son'a Collector Science Dreadnought.jpg",
        "/images/ships/ship-placeholder.png",
      ),
    ).toBe("/images/ships/Sona_Collector_Science_Dreadnought.jpg");
    expect(
      getWikiImageUrl(
        "ships",
        "File:obeliskcarrier.jpg",
        "/images/ships/ship-placeholder.png",
      ),
    ).toBe("/images/ships/obeliskcarrier.jpg");
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
