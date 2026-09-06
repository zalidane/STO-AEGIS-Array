import { describe, expect, it } from "vitest";
import {
  COLLECTION_BACKUP_FORMAT,
  COLLECTION_BACKUP_KIND,
  CollectionBackupError,
  collectionBackupFileError,
  collectionBackupFilename,
  formatCollectionBackupSummary,
  parseCollectionBackup,
  parseCollectionBackupJson,
  stringifyCollectionBackup,
  summarizeCollection,
} from "@/logic/collection/backup";
import {
  collectItem,
  createAccount,
  createCharacter,
  hydrateCollectionState,
} from "@/logic/collection/state";
import { createLoadout } from "@/logic/loadout/state";
import {
  createEmptyCollectionState,
  type CollectionClock,
  type CollectionState,
} from "@/logic/collection/types";

const clock: CollectionClock = {
  now: () => "2026-09-06T18:00:00.000Z",
  id: () => {
    clockIds += 1;
    return `id-${clockIds}`;
  },
};

let clockIds = 0;

function resetClock() {
  clockIds = 0;
}

function armory(): CollectionState {
  resetClock();
  let state = createEmptyCollectionState();
  state = createAccount(state, { name: "PC", platform: "pc" }, clock);
  state = createCharacter(
    state,
    {
      name: "Alice",
      career: "tactical",
      faction: "federation",
      race: "human",
      primarySpecialization: "intelligence",
      secondarySpecialization: "command",
    },
    clock,
  );
  state = collectItem(
    state,
    { kind: "ship", catalogId: 10, bind: "account" },
    clock,
  );
  state = collectItem(state, { kind: "item", catalogId: 44 }, clock);
  state = createLoadout(state, { shipId: 10, name: "Escort" }, clock);
  return state;
}

describe("collection backup", () => {
  it("round-trips accounts, captains, collected items, and builds", () => {
    const state = armory();
    const json = stringifyCollectionBackup(state, "2026-09-06T18:41:00.000Z");
    const parsed = JSON.parse(json) as {
      kind: string;
      formatVersion: number;
      exportedAt: string;
      collection: CollectionState;
    };

    expect(parsed.kind).toBe(COLLECTION_BACKUP_KIND);
    expect(parsed.formatVersion).toBe(COLLECTION_BACKUP_FORMAT);
    expect(parsed.exportedAt).toBe("2026-09-06T18:41:00.000Z");
    expect(parsed.collection.accounts).toHaveLength(1);
    expect(parsed.collection.characters[0]).toMatchObject({
      name: "Alice",
      career: "tactical",
      primarySpecialization: "intelligence",
      secondarySpecialization: "command",
    });
    expect(parsed.collection.entries.map((entry) => entry.catalogId)).toEqual([
      10, 44,
    ]);
    expect(parsed.collection.loadouts[0]?.name).toBe("Escort");

    const restored = parseCollectionBackupJson(json);
    expect(restored.source).toBe("backup");
    expect(restored.exportedAt).toBe("2026-09-06T18:41:00.000Z");
    expect(restored.state).toEqual(hydrateCollectionState(state));
    expect(summarizeCollection(restored.state)).toEqual({
      accounts: 1,
      captains: 1,
      items: 2,
      builds: 1,
    });
  });

  it("accepts a raw collection-state dump from localStorage", () => {
    const state = armory();
    const restored = parseCollectionBackupJson(JSON.stringify(state));
    expect(restored.source).toBe("collection");
    expect(restored.exportedAt).toBeNull();
    expect(restored.state.characters[0]?.name).toBe("Alice");
    expect(restored.state.loadouts[0]?.name).toBe("Escort");
  });

  it("migrates a v1 collection dump and invents an account folder", () => {
    const restored = parseCollectionBackup({
      version: 1,
      activeCharacterId: "c1",
      characters: [
        { id: "c1", name: "Alice", createdAt: "2026-08-22T00:00:00.000Z" },
      ],
      entries: [
        {
          id: "e1",
          characterId: "c1",
          kind: "ship",
          catalogId: 10,
          collectedAt: "2026-08-22T00:00:00.000Z",
        },
      ],
    });
    expect(restored.source).toBe("collection");
    expect(restored.state.version).toBe(3);
    expect(restored.state.accounts).toHaveLength(1);
    expect(restored.state.characters[0]?.name).toBe("Alice");
    expect(restored.state.entries).toHaveLength(1);
    expect(restored.state.loadouts).toEqual([]);
  });

  it("accepts an empty but valid backup", () => {
    const json = stringifyCollectionBackup(
      createEmptyCollectionState(),
      "2026-09-06T00:00:00.000Z",
    );
    const restored = parseCollectionBackupJson(json);
    expect(restored.state).toEqual(createEmptyCollectionState());
    expect(formatCollectionBackupSummary(summarizeCollection(restored.state))).toBe(
      "0 accounts, 0 captains, 0 collected items, 0 builds",
    );
  });

  it("names the download from the export day", () => {
    expect(collectionBackupFilename("2026-09-06T18:41:00.000Z")).toBe(
      "sto-aegis-collection-2026-09-06.json",
    );
    expect(collectionBackupFilename("not-a-date")).toBe("sto-aegis-collection.json");
  });

  it("pluralizes the restore summary", () => {
    expect(
      formatCollectionBackupSummary({
        accounts: 1,
        captains: 2,
        items: 1,
        builds: 0,
      }),
    ).toBe("1 account, 2 captains, 1 collected item, 0 builds");
  });

  it("strips a UTF-8 BOM before parsing", () => {
    const json = stringifyCollectionBackup(armory(), "2026-09-06T18:00:00.000Z");
    const restored = parseCollectionBackupJson(`\uFEFF${json}`);
    expect(restored.state.characters[0]?.name).toBe("Alice");
  });

  it("rejects garbage, share payloads, and newer envelopes", () => {
    expect(() => parseCollectionBackupJson("{")).toThrow(CollectionBackupError);
    expect(() => parseCollectionBackupJson("{")).toThrow(/not valid JSON/i);

    expect(() => parseCollectionBackup({ v: 1, shipId: 10 })).toThrow(
      /not a STO-AEGIS Array collection backup/i,
    );
    expect(() => parseCollectionBackup(null)).toThrow(CollectionBackupError);

    expect(() =>
      parseCollectionBackup({
        kind: COLLECTION_BACKUP_KIND,
        formatVersion: 2,
        exportedAt: "2026-09-06T00:00:00.000Z",
        collection: createEmptyCollectionState(),
      }),
    ).toThrow(/newer version/i);

    expect(() =>
      parseCollectionBackup({
        kind: COLLECTION_BACKUP_KIND,
        formatVersion: COLLECTION_BACKUP_FORMAT,
        collection: { version: 3 },
      }),
    ).toThrow(/could not be read/i);

    expect(collectionBackupFileError(new Error("nope"))).toMatch(/Could not read/i);
    expect(
      collectionBackupFileError(
        new DOMException("Storage quota exceeded", "QuotaExceededError"),
      ),
    ).toMatch(/too large/i);
  });
});
