import { describe, expect, it } from "vitest";
import {
  getBoffSeatColors,
  parseBoffSeats,
  toBoffSeatView,
} from "@/mappers/boffColors";
import { parseBoffSeat } from "@/utils/parsers";
import { abbreviateBoff } from "@/utils/formatters";

describe("parseBoffSeat", () => {
  it("parses a plain career seat", () => {
    expect(parseBoffSeat("Lieutenant Commander Tactical")).toEqual({
      rank: "Lieutenant Commander",
      career: "Tactical",
      specialization: undefined,
    });
  });

  it("parses Universal with Command specialization", () => {
    expect(parseBoffSeat("Lieutenant Commander Universal-Command")).toEqual({
      rank: "Lieutenant Commander",
      career: "Universal",
      specialization: "Command",
    });
  });

  it("parses multi-word specializations", () => {
    expect(parseBoffSeat("Commander Universal-Temporal Operative")).toEqual({
      rank: "Commander",
      career: "Universal",
      specialization: "Temporal Operative",
    });

    expect(
      parseBoffSeat("Lieutenant Commander Engineering-Miracle Worker"),
    ).toEqual({
      rank: "Lieutenant Commander",
      career: "Engineering",
      specialization: "Miracle Worker",
    });
  });
});

describe("boff color mapping", () => {
  it("maps Universal + Command to neutral and command colors", () => {
    expect(getBoffSeatColors("Lieutenant Commander Universal-Command")).toEqual(
      {
        career: "universal",
        specialization: "command",
      },
    );
  });

  it("maps career-only seats without specialization color", () => {
    expect(getBoffSeatColors("Ensign Science")).toEqual({
      career: "science",
      specialization: undefined,
    });
  });

  it("maps Intelligence and Pilot specializations", () => {
    expect(getBoffSeatColors("Lieutenant Science-Intelligence")).toEqual({
      career: "science",
      specialization: "intelligence",
    });

    expect(getBoffSeatColors("Commander Tactical-Pilot")).toEqual({
      career: "tactical",
      specialization: "pilot",
    });
  });
});

describe("boff formatting", () => {
  it("abbreviates ranks, careers, and specializations", () => {
    expect(abbreviateBoff("Lieutenant Commander Universal-Command")).toBe(
      "LtCmdr UNI-CMD",
    );
    expect(abbreviateBoff("Commander Universal-Temporal Operative")).toBe(
      "Cmdr UNI-TMP",
    );
    expect(abbreviateBoff("Lieutenant Science-Intelligence")).toBe(
      "Lt SCI-INT",
    );
  });

  it("builds dual-label seat views for hybrid chips", () => {
    const seat = toBoffSeatView("Lieutenant Commander Universal-Command");

    expect(seat.careerLabel).toBe("LtCmdr UNI");
    expect(seat.specializationLabel).toBe("CMD");
    expect(seat.career).toBe("universal");
    expect(seat.specialization).toBe("command");
  });

  it("parses and sorts a comma-separated boffs list by rank then type", () => {
    const seats = parseBoffSeats(
      "Lieutenant Universal,Commander Tactical-Pilot,Ensign Science",
    );

    expect(seats.map((seat) => seat.raw)).toEqual([
      "Commander Tactical-Pilot",
      "Lieutenant Universal",
      "Ensign Science",
    ]);
  });

  it("orders Commander through Ensign, then type alphabetically", () => {
    const seats = parseBoffSeats(
      "Ensign Tactical,Lieutenant Commander Science,Commander Universal-Miracle Worker,Commander Engineering,Lieutenant Tactical",
    );

    expect(seats.map((seat) => seat.raw)).toEqual([
      "Commander Engineering",
      "Commander Universal-Miracle Worker",
      "Lieutenant Commander Science",
      "Lieutenant Tactical",
      "Ensign Tactical",
    ]);
  });
});
