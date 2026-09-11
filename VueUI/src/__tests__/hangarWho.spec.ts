import { describe, expect, it } from "vitest";
import {
  hangarPetFitsShip,
  hangarShipFromCatalog,
  parseHangarWhoTokens,
  type HangarShip,
} from "@/logic/loadout/hangarWho";

function pet(who: string | null): { type: string; who: string | null } {
  return { type: "Hangar Bay", who };
}

function ship(fields: HangarShip): HangarShip {
  return fields;
}

const obelisk = ship({
  name: "Obelisk Carrier",
  wikiName: "Obelisk Carrier",
  type: "Engineering Carrier",
  tier: 5,
});

const fleetAtrox = ship({
  name: "Fleet Caitian Atrox Carrier (T6)",
  wikiName: "Fleet Caitian Atrox Carrier (T6)",
  type: "Science Carrier",
  tier: 6,
});

const atroxT5 = ship({
  name: "Caitian Atrox Carrier",
  wikiName: "Caitian Atrox Carrier",
  type: "Science Carrier",
  tier: 5,
});

const tarantula = ship({
  name: "Tholian Tarantula Dreadnought Cruiser",
  wikiName: "Tholian Tarantula Dreadnought Cruiser",
  type: "Dreadnought Cruiser",
  tier: 6,
});

const recluse = ship({
  name: "Tholian Recluse Carrier",
  wikiName: "Tholian Recluse Carrier",
  type: "Science Carrier",
  tier: 5,
});

const sheshar = ship({
  name: "Elachi Sheshar Intel Dreadnought Cruiser",
  wikiName: "Elachi Sheshar Intel Dreadnought Cruiser",
  type: "Dreadnought Cruiser",
  tier: 6,
});

const kvort = ship({
  name: "K'vort Temporal Flight Deck Raptor",
  wikiName: "K&#039;vort Temporal Flight Deck Raptor",
  type: "Flight Deck Raptor",
  displayType: "Temporal Flight Deck Raptor",
  tier: 6,
});

const quas = ship({
  name: "Herald Quas Flight Deck Carrier",
  wikiName: "Herald Quas Flight Deck Carrier",
  type: "Flight Deck Carrier",
  tier: 6,
});

const universe = ship({
  name: "Universe Temporal Heavy Dreadnought Cruiser",
  wikiName: "Universe Temporal Heavy Dreadnought Cruiser",
  type: "Heavy Dreadnought Cruiser",
  tier: 6,
});

const durgath = ship({
  name: "Durgath Temporal Heavy Dreadnought Battlecruiser",
  wikiName: "Durgath Temporal Heavy Dreadnought Battlecruiser",
  type: "Heavy Dreadnought Battlecruiser",
  tier: 6,
});

const voth = ship({
  name: "Voth Bastion Flight Deck Carrier",
  wikiName: "Voth Bastion Flight Deck Carrier",
  type: "Flight Deck Carrier",
  tier: 5,
});

const briostrys = ship({
  name: "Xindi-Aquatic Briostrys Dreadnought Carrier",
  wikiName: "Xindi-Aquatic Briostrys Dreadnought Carrier",
  type: "Dreadnought Carrier",
  tier: 6,
});

const compiler = ship({
  name: "Compiler Science Dreadnought",
  wikiName: "Compiler Science Dreadnought",
  type: "Science Dreadnought",
  tier: 6,
});

const scimitar = ship({
  name: "Scimitar Dreadnought Warbird",
  wikiName: "Scimitar Dreadnought Warbird",
  type: "Dreadnought Warbird",
  tier: 5,
});

const tlaru = ship({
  name: "Kelvin Timeline T'laru Intel Carrier Warbird",
  wikiName: "Kelvin Timeline T&#039;laru Intel Carrier Warbird",
  type: "Carrier Warbird",
  tier: 6,
});

const ranodaire = ship({
  name: "Ra'nodaire Support Carrier Warbird",
  wikiName: "Ra&#039;nodaire Support Carrier Warbird",
  type: "Carrier Warbird",
  displayType: "Support Carrier Warbird",
  tier: 6,
});

const vanguardSupport = ship({
  name: "Jem'Hadar Vanguard Support Carrier",
  wikiName: "Jem&#039;Hadar Vanguard Support Carrier",
  type: "Support Carrier",
  displayType: "Vanguard Support Carrier",
  tier: 6,
});

describe("hangarWho", () => {
  it("splits wiki who on commas and or", () => {
    expect(
      parseHangarWhoTokens(
        "Tholian Carrier or Dreadnought Cruiser",
      ),
    ).toEqual(["Tholian Carrier", "Dreadnought Cruiser"]);
    expect(
      parseHangarWhoTokens(
        "Any Xindi Carrier, Xindi Dreadnought Cruiser, or Xindi Strike Wing Escort",
      ),
    ).toEqual([
      "Any Xindi Carrier",
      "Xindi Dreadnought Cruiser",
      "Xindi Strike Wing Escort",
    ]);
  });

  it("lets unrestricted hangar pets onto any hangar hull", () => {
    expect(hangarPetFitsShip(pet(null), obelisk)).toBe(true);
    expect(hangarPetFitsShip(pet(""), kvort)).toBe(true);
    expect(hangarPetFitsShip(pet("Any Full Carrier"), null)).toBe(false);
  });

  it("ignores unique-console who text", () => {
    expect(
      hangarPetFitsShip(
        { type: "universal console", who: "Any Tuffli" },
        obelisk,
      ),
    ).toBe(true);
  });

  it("treats Any Full Carrier as a true carrier, not a flight-deck hull", () => {
    const who = "Any Full Carrier";
    expect(hangarPetFitsShip(pet(who), obelisk)).toBe(true);
    expect(hangarPetFitsShip(pet(who), briostrys)).toBe(true);
    expect(hangarPetFitsShip(pet(who), tlaru)).toBe(true);
    expect(hangarPetFitsShip(pet(who), quas)).toBe(false);
    expect(hangarPetFitsShip(pet(who), kvort)).toBe(false);
    expect(hangarPetFitsShip(pet(who), tarantula)).toBe(false);
    expect(hangarPetFitsShip(pet(who), compiler)).toBe(false);
  });

  it("allows the named K'Vort exception on a full-carrier pet", () => {
    const who = "Any Full Carrier or K&#039;Vort Temporal Flight Deck Raptor";
    expect(hangarPetFitsShip(pet(who), obelisk)).toBe(true);
    expect(hangarPetFitsShip(pet(who), kvort)).toBe(true);
    expect(hangarPetFitsShip(pet(who), quas)).toBe(false);
  });

  it("keeps Tholian family on a trailing hull-class clause", () => {
    const who = "Tholian Carrier or Dreadnought Cruiser";
    expect(hangarPetFitsShip(pet(who), recluse)).toBe(true);
    expect(hangarPetFitsShip(pet(who), tarantula)).toBe(true);
    expect(hangarPetFitsShip(pet(who), sheshar)).toBe(false);
    expect(hangarPetFitsShip(pet(who), obelisk)).toBe(false);
  });

  it("matches Caitian carriers and T6 carrier-class tokens", () => {
    expect(hangarPetFitsShip(pet("Any Caitian Carrier"), atroxT5)).toBe(true);
    expect(hangarPetFitsShip(pet("Any Caitian Carrier"), fleetAtrox)).toBe(true);
    expect(hangarPetFitsShip(pet("Any Caitian Carrier"), obelisk)).toBe(false);
    expect(
      hangarPetFitsShip(pet("Carrier [T6], Fleet Carrier [T6]"), fleetAtrox),
    ).toBe(true);
    expect(
      hangarPetFitsShip(pet("Carrier [T6], Fleet Carrier [T6]"), atroxT5),
    ).toBe(false);
    expect(
      hangarPetFitsShip(pet("Carrier [T6], Fleet Carrier [T6]"), quas),
    ).toBe(false);
  });

  it("matches named hulls and Any Voth Starship without requiring carrier", () => {
    expect(
      hangarPetFitsShip(
        pet("Universe Temporal Heavy Dreadnought Cruiser"),
        universe,
      ),
    ).toBe(true);
    expect(
      hangarPetFitsShip(
        pet("Universe Temporal Heavy Dreadnought Cruiser"),
        durgath,
      ),
    ).toBe(false);
    expect(hangarPetFitsShip(pet("Any Voth Starship"), voth)).toBe(true);
    expect(hangarPetFitsShip(pet("Any Voth Starship"), obelisk)).toBe(false);
    expect(
      hangarPetFitsShip(
        pet("Compiler Science Dreadnought, or Any Full Carrier"),
        compiler,
      ),
    ).toBe(true);
    expect(
      hangarPetFitsShip(
        pet("Compiler Science Dreadnought, or Any Full Carrier"),
        obelisk,
      ),
    ).toBe(true);
    expect(
      hangarPetFitsShip(
        pet("Compiler Science Dreadnought, or Any Full Carrier"),
        quas,
      ),
    ).toBe(false);
  });

  it("matches Xindi, Scimitar, and warbird hangar families", () => {
    expect(
      hangarPetFitsShip(
        pet("Any Xindi Carrier or Xindi Dreadnought Cruiser"),
        briostrys,
      ),
    ).toBe(true);
    expect(
      hangarPetFitsShip(
        pet("Any Xindi Carrier or Xindi Dreadnought Cruiser"),
        obelisk,
      ),
    ).toBe(false);
    expect(
      hangarPetFitsShip(
        pet("Any Full Carrier or Scimitar Dreadnought Warbird"),
        scimitar,
      ),
    ).toBe(true);
    expect(
      hangarPetFitsShip(
        pet(
          "Any Dreadnought Warbird, Kelvin Timeline T&#039;Laru Intel Carrier Warbird [T6], or Support Carrier Warbird [T6]",
        ),
        scimitar,
      ),
    ).toBe(true);
    expect(
      hangarPetFitsShip(
        pet(
          "Any Dreadnought Warbird, Kelvin Timeline T&#039;Laru Intel Carrier Warbird [T6], or Support Carrier Warbird [T6]",
        ),
        tlaru,
      ),
    ).toBe(true);
    expect(
      hangarPetFitsShip(
        pet(
          "Any Dreadnought Warbird, Kelvin Timeline T&#039;Laru Intel Carrier Warbird [T6], or Support Carrier Warbird [T6]",
        ),
        ranodaire,
      ),
    ).toBe(true);
    expect(
      hangarPetFitsShip(
        pet(
          "Any Dreadnought Warbird, Kelvin Timeline T&#039;Laru Intel Carrier Warbird [T6], or Support Carrier Warbird [T6]",
        ),
        obelisk,
      ),
    ).toBe(false);
  });

  it("matches plural Jem'Hadar carrier clauses", () => {
    const who =
      "Jem&#039;Hadar Dreadnought Carriers or Jem&#039;Hadar Support Carriers";
    expect(hangarPetFitsShip(pet(who), vanguardSupport)).toBe(true);
    expect(hangarPetFitsShip(pet(who), obelisk)).toBe(false);
  });

  it("reads GraphQL ship fields through hangarShipFromCatalog", () => {
    const mapped = hangarShipFromCatalog({
      name: "Fleet Caitian Atrox Carrier (T6)",
      wikiName: "Fleet Caitian Atrox Carrier (T6)",
      type: "Science Carrier",
      displayType: "Science Carrier",
      displayClass: "Atrox",
      shipType: { name: "Science Carrier" },
      tier: 6,
    });
    expect(hangarPetFitsShip(pet("Any Caitian Carrier"), mapped)).toBe(true);
  });
});
