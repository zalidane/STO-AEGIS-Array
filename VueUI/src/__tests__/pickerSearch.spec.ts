import { describe, expect, it } from "vitest";
import {
  loadoutItemSearchText,
  matchesPickerQuery,
} from "@/logic/loadout/pickerSearch";

describe("loadout picker search", () => {
  it("indexes infobox text fields for picker queries", () => {
    expect(
      loadoutItemSearchText({
        text1: "+25% Tetryon Damage&lt;br /&gt;+1.8 Auxiliary Power Setting",
      }),
    ).toContain("Tetryon Damage");
  });

  it("matches names or body copy", () => {
    const sticky = {
      name: "Console - Universal - Sticky Web",
      searchText: "+25% Tetryon Damage +1.8 Auxiliary Power Setting",
    };
    expect(matchesPickerQuery(sticky, "")).toBe(true);
    expect(matchesPickerQuery(sticky, "sticky")).toBe(true);
    expect(matchesPickerQuery(sticky, "tetryon")).toBe(true);
    expect(matchesPickerQuery(sticky, "phaser")).toBe(false);
  });
});
