import { describe, expect, it } from "vitest";
import {
  decideLoadoutPresence,
  deleteLoadoutConfirmText,
  loadoutsAfterDeleteChoice,
} from "@/logic/loadout/ensureLoadout";

describe("decideLoadoutPresence", () => {
  it("mints a loadout when a captain opens an empty hull", () => {
    expect(
      decideLoadoutPresence({
        hasShip: true,
        hasCharacter: true,
        loadoutIds: [],
        selectedId: null,
        suppressCreate: false,
      }),
    ).toEqual({ action: "create", selectedId: null });
  });

  it("does not replace a loadout the captain just deleted", () => {
    expect(
      decideLoadoutPresence({
        hasShip: true,
        hasCharacter: true,
        loadoutIds: [],
        selectedId: null,
        suppressCreate: true,
      }),
    ).toEqual({ action: "hold", selectedId: null });
  });

  it("keeps the current loadout when it is still in the list", () => {
    expect(
      decideLoadoutPresence({
        hasShip: true,
        hasCharacter: true,
        loadoutIds: ["alpha", "bravo"],
        selectedId: "bravo",
        suppressCreate: false,
      }),
    ).toEqual({ action: "hold", selectedId: "bravo" });
  });

  it("selects another loadout when the current id is gone", () => {
    expect(
      decideLoadoutPresence({
        hasShip: true,
        hasCharacter: true,
        loadoutIds: ["bravo"],
        selectedId: "alpha",
        suppressCreate: false,
      }),
    ).toEqual({ action: "select", selectedId: "bravo" });
  });

  it("waits until a ship and captain are both present", () => {
    expect(
      decideLoadoutPresence({
        hasShip: false,
        hasCharacter: true,
        loadoutIds: [],
        selectedId: null,
        suppressCreate: false,
      }).action,
    ).toBe("hold");
  });
});

describe("loadoutsAfterDeleteChoice", () => {
  it("suppresses a replacement when the last loadout is deleted", () => {
    expect(loadoutsAfterDeleteChoice(["delta"], "delta")).toEqual({
      selectedId: null,
      suppressCreate: true,
    });
  });

  it("selects a remaining loadout", () => {
    expect(loadoutsAfterDeleteChoice(["alpha", "bravo"], "alpha")).toEqual({
      selectedId: "bravo",
      suppressCreate: false,
    });
  });
});

describe("deleteLoadoutConfirmText", () => {
  it("names the loadout in the confirmation", () => {
    expect(deleteLoadoutConfirmText("Delta Prime")).toBe(
      "Are you sure you want to delete the loadout Delta Prime?",
    );
  });
});
