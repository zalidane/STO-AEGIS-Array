import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  mergeReputation,
  type ReputationCargoRow,
} from "./mergeReputation.js";

const omega: ReputationCargoRow = {
  color1: "#1F6321",
  color2: "#a0c1b9",
  icon: "File:Omega Mark icon.png",
  link: "Reputation: Task Force Omega",
  name: "Task Force Omega",
  description: "Stopping the Borg.",
  released: "Season Seven: New Romulus",
  environment: null,
  boff: null,
  secondary: null,
};

const pilot: ReputationCargoRow = {
  color1: "#4e98cc",
  color2: "#a0c1b9",
  icon: "File:Pilot Specialization icon.png",
  link: "Pilot (specialization)",
  name: "Pilot",
  description: "Maneuverability.",
  released: "Delta Rising",
  environment: "space",
  boff: "yes",
  secondary: null,
};

describe("mergeReputation", () => {
  it("inserts missing reputation names as full rows", () => {
    const merged = mergeReputation([omega, pilot], [
      {
        name: "Delta Alliance",
        color1: "#5b2c6f",
        color2: "#a0c1b9",
        icon: "File:Delta Mark icon.png",
        link: "Reputation: Delta Alliance",
        description: "Operation Delta Rising.",
        released: "Delta Rising",
        environment: null,
        boff: null,
        secondary: null,
      },
    ]);

    assert.equal(merged.length, 3);
    assert.equal(merged[2]?.name, "Delta Alliance");
    assert.equal(merged[2]?.environment, null);
    assert.equal(merged[2]?.link, "Reputation: Delta Alliance");
  });

  it("does not clobber non-empty wiki fields on an existing name", () => {
    const merged = mergeReputation([omega], [
      {
        name: "Task Force Omega",
        description: "should not win",
        icon: "File:should-not-win.png",
        released: "should not win",
      },
    ]);

    assert.equal(merged.length, 1);
    assert.equal(merged[0]?.description, omega.description);
    assert.equal(merged[0]?.icon, omega.icon);
    assert.equal(merged[0]?.released, omega.released);
  });

  it("fills empty description / icon on an existing cargo row", () => {
    const merged = mergeReputation(
      [{ ...omega, description: null, icon: null }],
      [
        {
          name: "Task Force Omega",
          description: "filled from supplement",
          icon: "File:Omega Mark icon.png",
        },
      ],
    );

    assert.equal(merged[0]?.description, "filled from supplement");
    assert.equal(merged[0]?.icon, "File:Omega Mark icon.png");
    assert.equal(merged[0]?.link, omega.link);
  });

  it("keeps specialization rows with non-empty environment", () => {
    const merged = mergeReputation([pilot], [
      {
        name: "Dyson Joint Command",
        link: "Reputation: Dyson Joint Command",
        description: "Explore the sphere.",
        released: "Season Eight: The Sphere",
        environment: null,
      },
    ]);

    assert.equal(merged.length, 2);
    assert.equal(merged[0]?.name, "Pilot");
    assert.equal(merged[0]?.environment, "space");
    assert.equal(merged[1]?.environment, null);
  });
});
