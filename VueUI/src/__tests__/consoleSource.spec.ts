import { describe, expect, it } from "vitest";
import {
  consolePickerSource,
  consoleSourceLabels,
  shortShipDisplayName,
  type ConsoleSourceItem,
  type ConsoleSourceShip,
} from "@/logic/loadout/consoleSource";

const domino: ConsoleSourceItem = {
  id: 10,
  name: "Console - Universal - D.O.M.I.N.O.",
  type: "Universal Console",
  catalogKind: "item",
};

const bajoran: ConsoleSourceShip = {
  id: 127,
  name: "Denorios Bajoran Interceptor",
  displayPrefix: "Bajoran",
  displayType: "Interceptor",
  uniconsole: "Console - Universal - D.O.M.I.N.O.",
  uniconsoleId: 10,
};

describe("shortShipDisplayName", () => {
  it("uses prefix and type and drops the class token", () => {
    expect(shortShipDisplayName(bajoran)).toBe("Bajoran Interceptor");
    expect(shortShipDisplayName(bajoran)).not.toBe("Bajoran Denorios Interceptor");
    expect(shortShipDisplayName(bajoran)).not.toBe("Denorios Bajoran Interceptor");
  });

  it("decodes entities in the display fields", () => {
    expect(
      shortShipDisplayName({
        name: "Jem&#039;Hadar Vanguard Carrier",
        displayPrefix: "Jem&#039;Hadar",
        displayType: "Vanguard Carrier",
      }),
    ).toBe("Jem'Hadar Vanguard Carrier");
  });

  it("keeps the catalog name when prefix and type are missing", () => {
    expect(
      shortShipDisplayName({
        name: "Guardian Cruiser",
        displayPrefix: null,
        displayType: null,
      }),
    ).toBe("Guardian Cruiser");
  });
});

describe("consolePickerSource", () => {
  it("shows the granting ship's short name", () => {
    expect(consolePickerSource(domino, [bajoran])).toBe("Bajoran Interceptor");
  });

  it("matches a console by listed name when the id link is missing", () => {
    expect(
      consolePickerSource(domino, [
        { ...bajoran, uniconsoleId: null },
      ]),
    ).toBe("Bajoran Interceptor");
  });

  it("omits source when no hull grants the console", () => {
    expect(
      consolePickerSource(
        {
          id: 3,
          name: "Console - Engineering - EPS Flow Regulator",
          type: "Ship Engineering Console",
          catalogKind: "item",
        },
        [bajoran],
      ),
    ).toBeNull();
    expect(consolePickerSource(domino, [])).toBeNull();
  });

  it("leaves a who restriction off the source line", () => {
    const restricted = {
      id: 4,
      name: "Console - Universal - Ablative Generator",
      type: "Universal Console",
      catalogKind: "item" as const,
      who: "Any Intrepid-class variant (Tier 5+)",
    };
    expect(consolePickerSource(restricted, [])).toBeNull();
  });

  it("leaves non-consoles without a source", () => {
    const weapon: ConsoleSourceItem = {
      id: 77,
      name: "Voice of the Prophets",
      type: "Experimental Weapon",
      catalogKind: "item",
    };
    expect(
      consolePickerSource(weapon, [
        {
          id: 127,
          name: "Denorios Bajoran Interceptor",
          displayPrefix: "Bajoran",
          displayType: "Interceptor",
          uniconsoleId: 77,
          uniconsole: "Voice of the Prophets",
        },
      ]),
    ).toBeNull();
  });

  it("keeps a single granting hull as the short name, without a tier", () => {
    expect(
      consolePickerSource(domino, [{ ...bajoran, tier: 6 }]),
    ).toBe("Bajoran Interceptor");
  });

  it("collapses faction hulls to one family and tier", () => {
    const crimson: ConsoleSourceItem = {
      id: 873,
      name: "Console - Universal - Crimson Force Field",
      type: "Universal Console",
      catalogKind: "item",
    };
    const tucker: ConsoleSourceShip = {
      id: 737,
      name: "Tucker Class Miracle Worker Cruiser",
      displayClass: "Tucker",
      displayType: "Tactical Miracle Worker Cruiser",
      tier: 6,
      uniconsole: crimson.name,
      uniconsoleId: crimson.id,
    };
    const klothos: ConsoleSourceShip = {
      id: 437,
      name: "Klothos Tactical Miracle Worker Cruiser",
      displayClass: "Klothos",
      displayType: "Tactical Miracle Worker Cruiser",
      tier: 6,
      uniconsole: crimson.name,
    };
    const tebok: ConsoleSourceShip = {
      id: 707,
      name: "Tebok Tactical Miracle Worker Warbird",
      displayClass: "Tebok",
      displayType: "Tactical Miracle Worker Warbird",
      tier: 6,
      uniconsoleId: crimson.id,
    };
    expect(consolePickerSource(crimson, [klothos, tebok, tucker])).toBe(
      "Miracle Worker Cruiser [T6]",
    );
  });

  it("collapses a heavy warbird onto the battlecruiser family", () => {
    const shielding: ConsoleSourceItem = {
      id: 803,
      name: "Console - Universal - Ablative Hazard Shielding",
      type: "Universal Console",
      catalogKind: "item",
    };
    const hull = (
      id: number,
      name: string,
      displayClass: string,
      displayType: string,
    ): ConsoleSourceShip => ({
      id,
      name,
      displayClass,
      displayType,
      tier: 6,
      uniconsoleId: shielding.id,
    });
    expect(
      consolePickerSource(shielding, [
        hull(34, "Arbiter Battlecruiser", "Arbiter", "Battlecruiser"),
        hull(448, "Kurak Battlecruiser", "Kurak", "Battlecruiser"),
        hull(540, "Morrigu Heavy Warbird", "Morrigu", "Heavy Warbird"),
      ]),
    ).toBe("Battlecruiser [T6]");
  });

  it("keeps unrelated granting hulls as separate family labels", () => {
    const cloak: ConsoleSourceItem = {
      id: 864,
      name: "Console - Universal - Cloaking Device",
      type: "Universal Console",
      catalogKind: "item",
    };
    expect(
      consolePickerSource(cloak, [
        {
          id: 127,
          name: "Defiant Tactical Escort Retrofit",
          displayClass: "Defiant",
          displayType: "Tactical Escort Retrofit",
          tier: 5,
          uniconsoleId: cloak.id,
        },
        {
          id: 141,
          name: "Dreadnought Cruiser",
          displayClass: "Galaxy",
          displayType: "Dreadnought Cruiser",
          tier: 5,
          uniconsoleId: cloak.id,
        },
        {
          id: 900,
          name: "Hathos Warbird",
          displayClass: "Hathos",
          displayType: "Warbird",
          tier: 6,
          uniconsole: cloak.name,
        },
      ]),
    ).toBe(
      "Dreadnought Cruiser [T5] · Escort Retrofit [T5] · Warbird [T6]",
    );
  });

  it("joins distinct granting hulls and collapses duplicate labels", () => {
    const andorian: ConsoleSourceShip = {
      id: 1,
      name: "Andorian Kuthar Pilot Escort",
      displayPrefix: "Andorian",
      displayType: "Pilot Escort",
      uniconsoleId: 10,
    };
    const dewan: ConsoleSourceShip = {
      id: 2,
      name: "Dewan Dynnasia Pilot Escort",
      displayPrefix: "Dewan",
      displayType: "Pilot Escort",
      uniconsoleId: 10,
    };
    const duplicate: ConsoleSourceShip = {
      id: 3,
      name: "Andorian Kuthar Pilot Escort (alias)",
      displayPrefix: "Andorian",
      displayType: "Pilot Escort",
      uniconsole: domino.name,
    };
    expect(consolePickerSource(domino, [andorian, dewan, duplicate])).toBe(
      "Andorian Pilot Escort · Dewan Pilot Escort",
    );
  });

  it("indexes sources for the picker without inventing unknown", () => {
    const labels = consoleSourceLabels(
      [
        domino,
        {
          id: 8,
          name: "Console - Tactical - Chronometric Capacitor",
          type: "Ship Tactical Console",
          catalogKind: "item",
        },
      ],
      [bajoran],
    );
    expect(labels.get("item:10")).toBe("Bajoran Interceptor");
    expect(labels.has("item:8")).toBe(false);
    expect([...labels.values()]).not.toContain("Unknown");
  });
});
