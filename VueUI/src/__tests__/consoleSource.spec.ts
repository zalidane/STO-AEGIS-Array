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
