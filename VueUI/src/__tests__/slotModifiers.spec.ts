import { describe, expect, it } from "vitest";
import {
  applyModifierPick,
  itemHasSuffixCatalog,
  modifierFitsItem,
  modifierFitsSocket,
  modifierSlotCountForQuality,
  modifierSocketsForItem,
  pruneModifiersForItem,
  seatedSuffixModifiers,
  slotAllowsSuffixModifiers,
  slotShowsSuffixModifiers,
  trimModifiersForQuality,
  type LoadoutModifier,
} from "@/logic/loadout/slotModifiers";

const catalog: LoadoutModifier[] = [
  {
    modifier: "[Dmg]",
    stats: "+3% Damage",
    type: "Ship Weapon,Ship Fore Weapon,Ship Aft Weapon",
    available: null,
    isunique: false,
    isepic: false,
  },
  {
    modifier: "[CrtH]",
    stats: "+2% Critical Chance",
    type: "Ship Weapon,Ship Fore Weapon,Ship Aft Weapon",
    available: null,
    isunique: false,
    isepic: false,
  },
  {
    modifier: "[Pen]",
    stats: "Shield Penetration",
    type: "Ship Weapon,Ship Fore Weapon,Ship Aft Weapon",
    available: null,
    isunique: true,
    isepic: false,
  },
  {
    modifier: "[Ac/Dm]",
    stats: "+10 Accuracy · +3% Damage",
    type: "Ship Weapon,Ship Fore Weapon,Ship Aft Weapon",
    available: null,
    isunique: true,
    isepic: true,
  },
  {
    modifier: "[Beams]",
    stats: "+Beam Damage",
    type: "Ship Engineering Console,Ship Science Console,Ship Tactical Console",
    available: null,
    isunique: false,
    isepic: false,
  },
  {
    modifier: "[+Ap]",
    stats: "+20% Antiproton Weapon Damage",
    type: "Kit",
    available: "Herald Tactical Kit",
    isunique: true,
    isepic: false,
  },
];

const phaser = { type: "ship fore weapon", name: "Phaser Dual Cannons" };

describe("slotModifiers", () => {
  it("opens 0–5 suffix sockets from seated quality", () => {
    expect(modifierSlotCountForQuality("Common")).toBe(0);
    expect(modifierSlotCountForQuality("Uncommon")).toBe(1);
    expect(modifierSlotCountForQuality("Rare")).toBe(2);
    expect(modifierSlotCountForQuality("Very Rare")).toBe(3);
    expect(modifierSlotCountForQuality("Ultra Rare")).toBe(4);
    expect(modifierSlotCountForQuality("Epic")).toBe(5);
    expect(modifierSlotCountForQuality("epic")).toBe(5);
  });

  it("allows suffix mods on ship gear except career consoles", () => {
    expect(slotAllowsSuffixModifiers("foreWeapon", "ship fore weapon")).toBe(
      true,
    );
    expect(slotAllowsSuffixModifiers("universalConsole", "universal console")).toBe(
      true,
    );
    expect(
      slotAllowsSuffixModifiers("tacticalConsole", "universal console"),
    ).toBe(true);
    expect(
      slotAllowsSuffixModifiers("tacticalConsole", "ship tactical console"),
    ).toBe(false);
    expect(
      slotAllowsSuffixModifiers("engineeringConsole", "ship engineering console"),
    ).toBe(false);
    expect(slotAllowsSuffixModifiers("starshipTrait", "starship trait")).toBe(
      false,
    );
    expect(slotAllowsSuffixModifiers("device", "ship device")).toBe(true);
  });

  it("matches wiki type lists and item-specific unique mods", () => {
    expect(modifierFitsItem(catalog[0]!, phaser)).toBe(true);
    expect(
      modifierFitsItem(catalog[4]!, {
        type: "universal console",
        name: "Console - Universal - Phase Shift",
      }),
    ).toBe(true);
    expect(
      modifierFitsItem(
        {
          ...catalog[4]!,
          available: "Console - Tactical - Vulnerability Locator",
        },
        {
          type: "universal console",
          name: "Console - Universal - Micro-Quantum Torpedoes Phalanx Array",
        },
      ),
    ).toBe(true);
    expect(
      modifierFitsItem(catalog[4]!, {
        type: "ship tactical console",
        name: "Vulnerability Locator",
      }),
    ).toBe(true);
    expect(modifierFitsItem(catalog[5]!, phaser)).toBe(false);
    expect(
      modifierFitsItem(catalog[5]!, {
        type: "kit",
        name: "Herald Tactical Kit",
      }),
    ).toBe(true);
  });

  it("reserves the fifth Epic socket for epic mods", () => {
    const selected = ["[Dmg]", "[CrtH]", "[Dmg]", "[Pen]", ""];
    expect(
      modifierFitsSocket(catalog[0]!, {
        index: 0,
        count: 5,
        selected,
      }),
    ).toBe(true);
    expect(
      modifierFitsSocket(catalog[3]!, {
        index: 3,
        count: 5,
        selected,
      }),
    ).toBe(false);
    expect(
      modifierFitsSocket(catalog[3]!, {
        index: 4,
        count: 5,
        selected,
      }),
    ).toBe(true);
    expect(
      modifierFitsSocket(catalog[0]!, {
        index: 4,
        count: 5,
        selected,
      }),
    ).toBe(false);
    expect(
      modifierFitsSocket(catalog[4]!, {
        index: 4,
        count: 5,
        selected: ["[Beams]", "", "", "", ""],
        hasEpicOptions: false,
      }),
    ).toBe(true);
    expect(
      modifierFitsSocket(catalog[2]!, {
        index: 2,
        count: 3,
        selected: ["[Pen]", "", ""],
      }),
    ).toBe(false);
  });

  it("drops extra sockets and the epic token when quality falls", () => {
    expect(
      trimModifiersForQuality(
        ["[Dmg]", "[CrtH]", "[Dmg]", "[Pen]", "[Ac/Dm]"],
        "Ultra Rare",
      ),
    ).toEqual(["[Dmg]", "[CrtH]", "[Dmg]", "[Pen]"]);
    expect(
      trimModifiersForQuality(["[Dmg]", "[CrtH]"], "Common"),
    ).toBeUndefined();
  });

  it("prunes tokens that do not fit the seated item", () => {
    expect(
      pruneModifiersForItem({
        selected: ["[Dmg]", "[+Ap]", "[CrtH]"],
        quality: "Very Rare",
        item: phaser,
        catalog,
      }),
    ).toEqual(["[Dmg]", "", "[CrtH]"]);
  });

  it("strips suffix mods from career consoles even when inherited", () => {
    expect(
      seatedSuffixModifiers({
        kind: "tacticalConsole",
        itemType: "ship tactical console",
        itemName: "Vulnerability Locator",
        quality: "Epic",
        selected: ["[Beams]"],
        catalog,
      }),
    ).toBeUndefined();
    expect(
      seatedSuffixModifiers({
        kind: "tacticalConsole",
        itemType: "universal console",
        itemName: "Console - Universal - Phase Shift",
        quality: "Uncommon",
        selected: ["[Beams]"],
        catalog,
      }),
    ).toEqual(["[Beams]"]);
  });

  it("hides suffix pickers when the catalog has no fitting mods", () => {
    expect(
      slotShowsSuffixModifiers({
        kind: "hangar",
        itemType: "hangar bay",
        itemName: "Hangar - Peregrine Fighters",
        catalog,
      }),
    ).toBe(false);
    expect(itemHasSuffixCatalog(catalog, phaser)).toBe(true);
  });

  it("lists stackable mods in standard sockets and epic mods last", () => {
    const sockets = modifierSocketsForItem({
      kind: "foreWeapon",
      quality: "Epic",
      itemType: phaser.type,
      itemName: phaser.name,
      selected: ["[Dmg]", "[Pen]"],
      catalog,
    });
    expect(sockets).toHaveLength(5);
    expect(sockets[0]?.options.map((row) => row.token)).toEqual([
      "[CrtH]",
      "[Dmg]",
    ]);
    expect(sockets[1]?.options.map((row) => row.token)).toEqual([
      "[CrtH]",
      "[Dmg]",
      "[Pen]",
    ]);
    expect(sockets[4]?.options.map((row) => row.token)).toEqual(["[Ac/Dm]"]);
  });

  it("writes a pick into the requested socket and trims empty tail slots", () => {
    expect(
      applyModifierPick({
        selected: ["[Dmg]"],
        index: 2,
        token: "[CrtH]",
        quality: "Very Rare",
      }),
    ).toEqual(["[Dmg]", "", "[CrtH]"]);
    expect(
      applyModifierPick({
        selected: ["[Dmg]", "", "[CrtH]"],
        index: 2,
        token: "",
        quality: "Very Rare",
      }),
    ).toEqual(["[Dmg]"]);
  });
});
