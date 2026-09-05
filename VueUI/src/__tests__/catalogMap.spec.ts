import { describe, expect, it } from "vitest";
import {
  asBoffPower,
  asCaptainTrait,
  buildLoadoutCatalog,
  indexLoadoutItemsByKey,
  lookupLoadoutItem,
  toLoadoutItem,
  toLoadoutPersonalTrait,
  toLoadoutTrait,
  toLoadoutTraySkill,
} from "@/logic/loadout/catalogMap";
import { loadoutOwnershipKey } from "@/logic/loadout/setBonus";

describe("catalogMap", () => {
  it("maps infobox rows onto loadout items with search text", () => {
    const item = toLoadoutItem({
      id: 11,
      name: "Console - Universal - Sticky Web",
      type: "universal console",
      rarity: "Very Rare",
      image: "File:Sticky_Web_icon.png",
      equiplimit: 1,
      who: "Any Tuffli",
      text1: "+25% Tetryon Damage",
    });
    expect(item).toMatchObject({
      id: 11,
      name: "Console - Universal - Sticky Web",
      type: "universal console",
      rarity: "Very Rare",
      equiplimit: 1,
      catalogKind: "item",
      who: "Any Tuffli",
    });
    expect(item.image).toBe("/images/items/Sticky_Web_icon.png");
    expect(item.searchText).toContain("Tetryon Damage");
  });

  it("prefers starship-trait iconName over the display name", () => {
    const trait = toLoadoutTrait({
      id: 4,
      name: "Ablative Shell",
      iconName: "Special Shell",
    });
    expect(trait.catalogKind).toBe("starshipTrait");
    expect(trait.image).toBe("/images/starship-traits/Special_Shell_icon.png");
    expect(trait.image).not.toBe(
      "/images/starship-traits/Ablative_Shell_icon.png",
    );
  });

  it("maps personal traits and tray skills", () => {
    const personal = toLoadoutPersonalTrait({
      id: 8,
      name: "Beam Barrage",
      type: "char",
      iconName: "Beam Barrage",
      environment: "space",
      career: "Tactical",
      source: "Career",
    });
    expect(personal).toMatchObject({
      catalogKind: "trait",
      environment: "space",
      career: "Tactical",
      who: "Career",
    });
    expect(personal.image).toBe("/images/traits/Beam_Barrage_icon.png");

    const power = toLoadoutTraySkill({
      id: 7,
      name: "Jam Targeting Sensors",
      type: "Science",
      region: "Space",
      description: "Placate",
      system: "Sensors",
      rank1rank: "Ensign",
      rank2rank: "Lieutenant",
      rank3rank: "Lieutenant Commander",
    });
    expect(power.catalogKind).toBe("traySkill");
    expect(power.environment).toBe("Space");
    expect(power.searchText).toBe("Placate Sensors");
    expect(power.ranks).toEqual([
      "Ensign",
      "Lieutenant",
      "Lieutenant Commander",
      undefined,
      undefined,
    ]);
    expect(asBoffPower(power)).toEqual({
      id: 7,
      name: "Jam Targeting Sensors",
      type: "Science",
      region: "Space",
      ranks: [
        "Ensign",
        "Lieutenant",
        "Lieutenant Commander",
        undefined,
        undefined,
      ],
    });
  });

  it("treats non-starship catalog kinds as personal captain traits", () => {
    expect(
      asCaptainTrait({
        id: 1,
        name: "Beam Barrage",
        type: "char",
        catalogKind: "trait",
        environment: "space",
      }),
    ).toMatchObject({ catalogKind: "trait", environment: "space" });
    expect(
      asCaptainTrait({
        id: 2,
        name: "Ablative Shell",
        type: "starship trait",
        catalogKind: "starshipTrait",
      }),
    ).toMatchObject({ catalogKind: "starshipTrait" });
  });

  it("indexes the combined catalog by ownership key", () => {
    const catalog = buildLoadoutCatalog({
      items: [
        {
          id: 11,
          name: "Phaser Dual Cannons",
          type: "ship fore weapon",
        },
      ],
      starshipTraits: [{ id: 4, name: "Ablative Shell" }],
    });
    const byKey = indexLoadoutItemsByKey(catalog);
    expect(
      lookupLoadoutItem(byKey, "item", 11)?.name,
    ).toBe("Phaser Dual Cannons");
    expect(byKey.get(loadoutOwnershipKey("starshipTrait", 4))?.name).toBe(
      "Ablative Shell",
    );
  });
});
