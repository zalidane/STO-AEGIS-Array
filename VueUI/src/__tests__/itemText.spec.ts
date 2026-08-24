import { describe, expect, it } from "vitest";
import {
  displayInfoboxType,
  mapEquipmentInfoboxToBrowserItem,
} from "@/logic/collection/itemBrowser";
import {
  infoboxTextBlocks,
  parseInfoboxTextField,
} from "@/logic/collection/itemText";

describe("parseInfoboxTextField", () => {
  it("returns null for empty fields", () => {
    expect(parseInfoboxTextField(null)).toBeNull();
    expect(parseInfoboxTextField("  ")).toBeNull();
  });

  it("keeps a plain stat line unchanged", () => {
    expect(
      parseInfoboxTextField(
        "Adds 7.5% of your Auxiliary power to your Shield power as bonus power",
      ),
    ).toEqual({
      text: "Adds 7.5% of your Auxiliary power to your Shield power as bonus power",
      subscript: null,
    });
  });

  it("turns a trailing parenthetical into a subscript and strips wiki quotes", () => {
    expect(
      parseInfoboxTextField(
        "+7.5 Additional Auxiliary Power \n:&#039;&#039;(Bonus increases at low Auxiliary Power)&#039;&#039;",
      ),
    ).toEqual({
      text: "+7.5 Additional Auxiliary Power",
      subscript: "(Bonus increases at low Auxiliary Power)",
    });
  });

  it("splits an inline parenthetical on the same line", () => {
    expect(
      parseInfoboxTextField(
        "Maximum Warp Factor 9.97 &#039;&#039;(Max speed modified by Sector Space Speed skill.)&#039;&#039;",
      ),
    ).toEqual({
      text: "Maximum Warp Factor 9.97",
      subscript: "(Max speed modified by Sector Space Speed skill.)",
    });
  });

  it("turns HTML line breaks into real newlines", () => {
    expect(parseInfoboxTextField("First<br>Second")).toEqual({
      text: "First\nSecond",
      subscript: null,
    });
  });

  it("strips quotation marks around parenthetical notes", () => {
    expect(
      parseInfoboxTextField('+15.3 Starship Damage Control\n:"(Improves Passive Hull Regeneration)"'),
    ).toEqual({
      text: "+15.3 Starship Damage Control",
      subscript: "(Improves Passive Hull Regeneration)",
    });
  });
});

describe("infoboxTextBlocks", () => {
  it("keeps only populated Text 1–9 fields in order", () => {
    const blocks = infoboxTextBlocks({
      text1: null,
      text2: "+7.5 Additional Auxiliary Power \n:''(Bonus increases at low Auxiliary Power)''",
      text3: "+10 Maximum Auxiliary Power \n:''(Allows your Auxiliary Power to exceed 125)''",
      text4: "Maximum Warp Factor 9.97",
      text5: null,
    });
    expect(blocks).toEqual([
      {
        text: "+7.5 Additional Auxiliary Power",
        subscript: "(Bonus increases at low Auxiliary Power)",
      },
      {
        text: "+10 Maximum Auxiliary Power",
        subscript: "(Allows your Auxiliary Power to exceed 125)",
      },
      { text: "Maximum Warp Factor 9.97", subscript: null },
    ]);
  });
});

describe("mapEquipmentInfoboxToBrowserItem", () => {
  it("maps populated text fields onto the item preview card", () => {
    const mapped = mapEquipmentInfoboxToBrowserItem({
      id: 12,
      name: "Obelisk Subspace Rift Warp Core",
      type: "Warp Engine",
      rarity: "Very Rare",
      boundto: "account",
      who: "Obelisk Carrier",
      text2:
        "+7.5 Additional Auxiliary Power \n:''(Bonus increases at low Auxiliary Power)''",
      text6: "Slipstream drive recharges 100% faster",
    });
    expect(mapped.listDescription).toBe("+7.5 Additional Auxiliary Power");
    expect(mapped.type).toBe("Warp Core");
    expect(mapped.textBlocks).toEqual([
      {
        text: "+7.5 Additional Auxiliary Power",
        subscript: "(Bonus increases at low Auxiliary Power)",
      },
      { text: "Slipstream drive recharges 100% faster", subscript: null },
    ]);
    expect(mapped.imageSrc).toBe(
      "/images/items/Obelisk_Subspace_Rift_Warp_Core_icon.png",
    );
  });

  it("prefers a stored infobox image filename over the name guess", () => {
    const mapped = mapEquipmentInfoboxToBrowserItem({
      id: 1,
      name: "Phaser Beam Array",
      type: "Ship Fore Weapon",
      image: "Custom_Phaser_icon.png",
    });
    expect(mapped.imageSrc).toBe("/images/items/Custom_Phaser_icon.png");
  });
});

describe("displayInfoboxType", () => {
  it("renames warp and singularity engines to cores", () => {
    expect(displayInfoboxType("Warp Engine")).toBe("Warp Core");
    expect(displayInfoboxType("Singularity Engine")).toBe("Singularity Core");
  });

  it("leaves impulse engines and other types unchanged", () => {
    expect(displayInfoboxType("Impulse Engine")).toBe("Impulse Engine");
    expect(displayInfoboxType("Ship Engineering Console")).toBe(
      "Ship Engineering Console",
    );
  });

  it("renames each part of a combined type", () => {
    expect(displayInfoboxType("Warp Engine,Singularity Engine")).toBe(
      "Warp Core, Singularity Core",
    );
  });
});
