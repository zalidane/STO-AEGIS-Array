import { describe, expect, it } from "vitest";
import {
  attachCombatParse,
  clearCombatParse,
  createLoadout,
} from "@/logic/loadout/state";
import { createCharacter, hydrateCollectionState } from "@/logic/collection/state";
import {
  createEmptyCollectionState,
  type CollectionClock,
} from "@/logic/collection/types";
import {
  formatCombatDps,
  formatCombatDuration,
  mixLabel,
  parseCombatLog,
  participationLine,
  peakFightDps,
  rankNotes,
  combatLogFileError,
  readCombatLogText,
  combatLogInfoParagraphs,
} from "@/logic/combatlog";
import {
  parseCombatLine,
  parsePlayerInternal,
  parseTimestamp,
  playerMatchesCaptain,
} from "@/logic/combatlog/parseLine";

function line(input: {
  at: string;
  owner: string;
  ownerId: string;
  source?: string;
  sourceId?: string;
  target: string;
  targetId: string;
  type?: string;
  flags?: string;
  mag: number;
  mag2?: number;
}): string {
  const source = input.source ?? input.owner;
  const sourceId = input.sourceId ?? "*";
  return [
    `${input.at}::${input.owner}`,
    input.ownerId,
    source,
    sourceId,
    input.target,
    input.targetId,
    "Phaser",
    "Phaser",
    input.type ?? "HitPoints",
    input.flags ?? "None",
    String(input.mag),
    String(input.mag2 ?? input.mag),
  ].join(",");
}

const ALICE = "P[1 Alice@Handle]";
const BOB = "P[2 Bob@Other]";
const BORG = "C[9 Cube]";
const PET = "C[8 Peregrine]";

describe("parseTimestamp", () => {
  it("reads Hilbert yy:MM:dd:HH:mm:ss.f stamps", () => {
    expect(parseTimestamp("24:08:30:12:00:00.5")).toBe(
      Date.UTC(2024, 7, 30, 12, 0, 0, 500),
    );
  });
});

describe("parseCombatLine", () => {
  it("parses live STO P[id@account Name@Handle] rows with empty flags", () => {
    const raw =
      "26:08:30:19:08:10.8::Jenis,P[14339743@34590607 Jenis@futureone#8504],,*,Assimilator,C[12 Space_Borg_Battleship_Raidisode],Experimental Hyperexcited Ion Stream Projector,Pn.0p672u1,Shield,,-4486.21,-4501.28";
    const parsed = parseCombatLine(raw);
    expect(parsed?.ownerDisplay).toBe("Jenis");
    expect(parsed?.ownerInternal).toBe(
      "P[14339743@34590607 Jenis@futureone#8504]",
    );
    expect(parsed?.heal).toBe(false);
    const player = parsePlayerInternal(
      parsed?.ownerInternal ?? "",
      parsed?.ownerDisplay,
    );
    expect(player?.characterName).toBe("Jenis");
    expect(player?.handle).toBe("futureone#8504");
    expect(playerMatchesCaptain(player!, "Jenis Sarmin")).toBe(true);
  });

  it("skips falling ticks", () => {
    const raw = line({
      at: "24:08:30:12:00:00.0",
      owner: "Alice",
      ownerId: ALICE,
      target: "Ground",
      targetId: BORG,
      flags: "Falling",
      mag: 800,
    });
    expect(parseCombatLine(raw)).toBeNull();
  });

  it("treats negative HitPoints as heals", () => {
    const parsed = parseCombatLine(
      line({
        at: "24:08:30:12:00:00.0",
        owner: "Alice",
        ownerId: ALICE,
        target: "Bob",
        targetId: BOB,
        mag: -400,
        mag2: 0,
      }),
    );
    expect(parsed?.heal).toBe(true);
  });
});

describe("parseCombatLog", () => {
  it("splits fights on a 100s idle gap and numbers Combat 1, Combat 2", () => {
    const text = [
      line({
        at: "24:08:30:12:00:00.0",
        owner: "Alice",
        ownerId: ALICE,
        target: "Borg",
        targetId: BORG,
        mag: 1000,
      }),
      line({
        at: "24:08:30:12:00:10.0",
        owner: "Alice",
        ownerId: ALICE,
        target: "Borg",
        targetId: BORG,
        mag: 1000,
      }),
      line({
        at: "24:08:30:12:02:00.0",
        owner: "Alice",
        ownerId: ALICE,
        target: "Borg",
        targetId: BORG,
        mag: 5000,
      }),
    ].join("\n");
    const result = parseCombatLog(text, {
      captainName: "Alice",
      fileName: "combatlog.log",
      uploadedAt: "2026-08-30T00:00:00.000Z",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.parse.fights).toHaveLength(2);
    expect(result.parse.fights[0]?.index).toBe(1);
    expect(result.parse.fights[1]?.index).toBe(2);
    expect(result.parse.fights[0]?.damageOut).toBe(2000);
    expect(result.parse.fights[0]?.dps).toBe(200);
    expect(result.parse.fights[1]?.dps).toBe(5000);
    expect(result.parse.fights[0]?.solo).toBe(true);
    expect(result.parse.fights[0]?.participation).toBe("Solo parse · DPS");
  });

  it("attributes pet damage to the owning captain", () => {
    const text = line({
      at: "24:08:30:12:00:00.0",
      owner: "Alice",
      ownerId: ALICE,
      source: "Peregrine",
      sourceId: PET,
      target: "Borg",
      targetId: BORG,
      mag: 2500,
    });
    const result = parseCombatLog(text, {
      captainName: "Alice",
      fileName: "combatlog.log",
      uploadedAt: "2026-08-30T00:00:00.000Z",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.parse.fights[0]?.damageOut).toBe(2500);
  });

  it("does not credit self-heals as a healer role", () => {
    const text = [
      line({
        at: "24:08:30:12:00:00.0",
        owner: "Alice",
        ownerId: ALICE,
        target: "Borg",
        targetId: BORG,
        mag: 100,
      }),
      line({
        at: "24:08:30:12:00:01.0",
        owner: "Alice",
        ownerId: ALICE,
        target: "Alice",
        targetId: ALICE,
        mag: -9000,
        mag2: 0,
      }),
    ].join("\n");
    const result = parseCombatLog(text, {
      captainName: "Alice",
      fileName: "combatlog.log",
      uploadedAt: "2026-08-30T00:00:00.000Z",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.parse.fights[0]?.allyHeals).toBe(0);
    expect(result.parse.fights[0]?.mixLabel).toBe("DPS");
  });

  it("credits ally heals and ranks only other P[] captains", () => {
    const text = [
      line({
        at: "24:08:30:12:00:00.0",
        owner: "Alice",
        ownerId: ALICE,
        target: "Borg",
        targetId: BORG,
        mag: 100,
      }),
      line({
        at: "24:08:30:12:00:00.5",
        owner: "Bob",
        ownerId: BOB,
        target: "Borg",
        targetId: BORG,
        mag: 400,
      }),
      line({
        at: "24:08:30:12:00:01.0",
        owner: "Alice",
        ownerId: ALICE,
        target: "Bob",
        targetId: BOB,
        mag: -800,
        mag2: 0,
      }),
      line({
        at: "24:08:30:12:00:02.0",
        owner: "Borg",
        ownerId: BORG,
        target: "Alice",
        targetId: ALICE,
        mag: 5000,
      }),
      line({
        at: "24:08:30:12:00:03.0",
        owner: "Borg",
        ownerId: BORG,
        target: "Bob",
        targetId: BOB,
        mag: 100,
      }),
    ].join("\n");
    const result = parseCombatLog(text, {
      captainName: "Alice",
      fileName: "combatlog.log",
      uploadedAt: "2026-08-30T00:00:00.000Z",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const fight = result.parse.fights[0];
    expect(fight?.solo).toBe(false);
    expect(fight?.allyHeals).toBe(800);
    expect(fight?.damageTaken).toBe(5000);
    expect(fight?.rankNotes).toEqual([
      "most damage taken",
      "most ally healing",
    ]);
    expect(fight?.participation).toContain("most damage taken");
  });

  it("picks the matching P[] with the most outgoing damage", () => {
    const alt = "P[3 Alice@Alt]";
    const text = [
      line({
        at: "24:08:30:12:00:00.0",
        owner: "Alice",
        ownerId: ALICE,
        target: "Borg",
        targetId: BORG,
        mag: 100,
      }),
      line({
        at: "24:08:30:12:00:01.0",
        owner: "Alice",
        ownerId: alt,
        target: "Borg",
        targetId: BORG,
        mag: 9000,
      }),
    ].join("\n");
    const result = parseCombatLog(text, {
      captainName: "Alice",
      fileName: "combatlog.log",
      uploadedAt: "2026-08-30T00:00:00.000Z",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.parse.captainId).toBe(alt);
    expect(result.parse.fights[0]?.damageOut).toBe(9000);
  });

  it("never ranks a friendly NPC as a tank", () => {
    const friendly = "C[4 U.S.S. Shirgat]";
    const text = [
      line({
        at: "24:08:30:12:00:00.0",
        owner: "Alice",
        ownerId: ALICE,
        target: "Borg",
        targetId: BORG,
        mag: 100,
      }),
      line({
        at: "24:08:30:12:00:01.0",
        owner: "Borg",
        ownerId: BORG,
        target: "Shirgat",
        targetId: friendly,
        mag: 50000,
      }),
    ].join("\n");
    const result = parseCombatLog(text, {
      captainName: "Alice",
      fileName: "combatlog.log",
      uploadedAt: "2026-08-30T00:00:00.000Z",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.parse.fights[0]?.solo).toBe(true);
    expect(result.parse.fights[0]?.rankNotes).toEqual([]);
  });

  it("matches a full captain name to the in-game first name", () => {
    const text = [
      "26:08:30:19:08:10.8::Jenis,P[14339743@34590607 Jenis@futureone#8504],,*,Assimilator,C[12 Cube],Ion Stream,Pn.0p672u1,Electrical,,500,4170",
      "26:08:30:19:08:10.8::Albuquerque,P[1751362@4193996 Albuquerque@dukeofgoa],,*,Assimilator,C[12 Cube],Phaser Array,Pn.Cedjls,Phaser,,128,780",
    ].join("\n");
    const result = parseCombatLog(text, {
      captainName: "Jenis Sarmin",
      fileName: "combatlog.log",
      uploadedAt: "2026-08-30T00:00:00.000Z",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.parse.captainId).toBe(
      "P[14339743@34590607 Jenis@futureone#8504]",
    );
    expect(result.parse.captainLabel).toBe("Jenis@futureone#8504");
    expect(result.parse.fights[0]?.damageOut).toBe(500);
  });

  it("returns no-captain when the name is not in the log", () => {
    const text = line({
      at: "24:08:30:12:00:00.0",
      owner: "Bob",
      ownerId: BOB,
      target: "Borg",
      targetId: BORG,
      mag: 100,
    });
    expect(
      parseCombatLog(text, {
        captainName: "Alice",
        fileName: "combatlog.log",
        uploadedAt: "2026-08-30T00:00:00.000Z",
      }),
    ).toEqual({ ok: false, reason: "no-captain" });
  });
});

describe("participation labels", () => {
  it("treats combinations as first-class", () => {
    expect(mixLabel(8000, 12000, 0)).toBe("Tank with strong DPS");
    expect(
      participationLine({
        solo: true,
        mixLabel: "Tank with strong DPS",
        rankNotes: ["most damage taken"],
      }),
    ).toBe("Solo parse · Tank with strong DPS");
    expect(
      rankNotes({
        damageOut: 100,
        damageTaken: 50,
        allyHeals: 0,
        others: [{ damageOut: 200, damageTaken: 80, allyHeals: 0 }],
      }),
    ).toEqual([]);
    expect(
      participationLine({
        solo: false,
        mixLabel: "DPS",
        rankNotes: [],
        otherPlayerCount: 4,
      }),
    ).toBe("DPS · 4 other captains in this parse");
  });
});

describe("combat parse persistence", () => {
  const clock: CollectionClock = {
    now: () => "2026-08-30T00:00:00.000Z",
    id: () => "lo-1",
  };

  it("stores a summary on the loadout and hydrates it back", () => {
    let state = createCharacter(createEmptyCollectionState(), "Alice", clock);
    state = createLoadout(state, { shipId: 1, name: "Build 1" }, clock);
    const parsed = parseCombatLog(
      line({
        at: "24:08:30:12:00:00.0",
        owner: "Alice",
        ownerId: ALICE,
        target: "Borg",
        targetId: BORG,
        mag: 1200,
      }),
      {
        captainName: "Alice",
        fileName: "combatlog.log",
        uploadedAt: "2026-08-30T00:00:00.000Z",
      },
    );
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    state = attachCombatParse(state, "lo-1", parsed.parse, clock);
    expect(state.loadouts[0]?.combatParse?.fights[0]?.dps).toBe(1200);
    const hydrated = hydrateCollectionState(JSON.parse(JSON.stringify(state)));
    expect(hydrated.loadouts[0]?.combatParse?.fileName).toBe("combatlog.log");
    const cleared = clearCombatParse(hydrated, "lo-1", clock);
    expect(cleared.loadouts[0]?.combatParse).toBeUndefined();
  });
});

describe("formatters", () => {
  it("formats DPS and duration for the board", () => {
    expect(formatCombatDps(12432.4)).toBe("12,432");
    expect(formatCombatDuration(10_000)).toBe("10s");
    expect(formatCombatDuration(125_000)).toBe("2:05");
    expect(
      peakFightDps({
        uploadedAt: "",
        fileName: "",
        captainId: "",
        captainLabel: "",
        fights: [
          {
            index: 1,
            durationMs: 10,
            damageOut: 1,
            dps: 100,
            damageTaken: 0,
            allyHeals: 0,
            solo: true,
            otherPlayerCount: 0,
            mixLabel: "DPS",
            rankNotes: [],
            participation: "Solo parse · DPS",
          },
          {
            index: 2,
            durationMs: 10,
            damageOut: 1,
            dps: 900,
            damageTaken: 0,
            allyHeals: 0,
            solo: true,
            otherPlayerCount: 0,
            mixLabel: "DPS",
            rankNotes: [],
            participation: "Solo parse · DPS",
          },
        ],
      }),
    ).toBe(900);
  });
});

describe("combat log file read", () => {
  it("explains a locked GameClient log", () => {
    expect(combatLogFileError(new DOMException("locked", "NotReadableError"))).toMatch(
      /copy the file/i,
    );
  });

  it("reads text from a Blob", async () => {
    await expect(
      readCombatLogText(new Blob(["26:08:30:12:00:00.0::Jenis"], { type: "text/plain" })),
    ).resolves.toBe("26:08:30:12:00:00.0::Jenis");
  });
});

describe("combatLogInfoParagraphs", () => {
  it("names the captain and covers upload, privacy, and locked-file notes", () => {
    const paragraphs = combatLogInfoParagraphs("Jenis");
    expect(paragraphs.join(" ")).toContain("Jenis");
    expect(paragraphs.join(" ")).toMatch(/combatlog\.log/i);
    expect(paragraphs.some((line) => /does not store the raw file/i.test(line))).toBe(
      true,
    );
    expect(paragraphs.some((line) => /GameClient/i.test(line))).toBe(true);
    expect(paragraphs.some((line) => /does not predict DPS/i.test(line))).toBe(
      true,
    );
  });
});
