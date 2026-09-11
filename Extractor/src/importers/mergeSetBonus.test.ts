import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  mergeSetBonus,
  unionMemberList,
  type SetBonusCargoRow,
} from "./mergeSetBonus.js";

const borg: SetBonusCargoRow = {
  Name: "Autonomous Regeneration Sequencer",
  SetPage: "Assimilated Borg Technology",
  ReqItems: "2",
  Passives: "Regenerates 1% of your Hull every 2 seconds",
  TraySkills: null,
  Procs: "When taking damage, 2% chance to trigger",
  Abilities: null,
};

describe("unionMemberList", () => {
  it("unions newline lists case-insensitively", () => {
    assert.equal(
      unionMemberList(
        "Nausicaan Energy Torpedo Launcher",
        "nausicaan energy torpedo launcher\nConsole - Science - Nausicaan Siphon Capacitor",
      ),
      "Nausicaan Energy Torpedo Launcher\nConsole - Science - Nausicaan Siphon Capacitor",
    );
  });
});

describe("mergeSetBonus", () => {
  it("inserts missing bonus names as full rows", () => {
    const merged = mergeSetBonus([], [
      {
        Name: "Bio-Molecular Instability",
        SetPage: "Counter-Command Ordnance",
        ReqItems: "2",
        Passives: "+7.5% Bonus Phaser Damage",
        Members: "Heavy Bio-Molecular * Turret",
      },
    ]);
    assert.equal(merged.length, 1);
    assert.equal(merged[0]?.Name, "Bio-Molecular Instability");
    assert.equal(merged[0]?.SetPage, "Counter-Command Ordnance");
    assert.equal(merged[0]?.Members, "Heavy Bio-Molecular * Turret");
  });

  it("does not clobber wiki passives on an existing name", () => {
    const merged = mergeSetBonus([borg], [
      {
        Name: "Autonomous Regeneration Sequencer",
        Passives: "should not win",
        Members: "Assimilated *",
      },
    ]);
    assert.equal(merged.length, 1);
    assert.equal(merged[0]?.Passives, borg.Passives);
    assert.equal(merged[0]?.Members, "Assimilated *");
  });

  it("fills empty members on an existing cargo row", () => {
    const merged = mergeSetBonus(
      [{ ...borg, Members: null }],
      [
        {
          Name: "Autonomous Regeneration Sequencer",
          Members: "Assimilated Borg *\nConsole - Tactical - Assimilated Module",
        },
      ],
    );
    assert.equal(
      merged[0]?.Members,
      "Assimilated Borg *\nConsole - Tactical - Assimilated Module",
    );
  });
});
