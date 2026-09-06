import { hydrateCollectionState } from "@/logic/collection/state";
import type { CollectionState } from "@/logic/collection/types";

export const COLLECTION_BACKUP_KIND = "sto-aegis-collection";
export const COLLECTION_BACKUP_FORMAT = 1 as const;

export type CollectionBackupFile = {
  kind: typeof COLLECTION_BACKUP_KIND;
  formatVersion: typeof COLLECTION_BACKUP_FORMAT;
  exportedAt: string;
  collection: CollectionState;
};

export type CollectionBackupSource = "backup" | "collection";

export type ParsedCollectionBackup = {
  state: CollectionState;
  exportedAt: string | null;
  source: CollectionBackupSource;
};

export type CollectionBackupSummary = {
  accounts: number;
  captains: number;
  items: number;
  builds: number;
};

export type CollectionBackupErrorCode =
  | "invalid-json"
  | "not-a-backup"
  | "newer-format"
  | "unreadable";

export class CollectionBackupError extends Error {
  readonly code: CollectionBackupErrorCode;

  constructor(code: CollectionBackupErrorCode, message: string) {
    super(message);
    this.name = "CollectionBackupError";
    this.code = code;
  }
}

export function createCollectionBackup(
  state: CollectionState,
  exportedAt: string,
): CollectionBackupFile {
  return {
    kind: COLLECTION_BACKUP_KIND,
    formatVersion: COLLECTION_BACKUP_FORMAT,
    exportedAt,
    collection: state,
  };
}

export function stringifyCollectionBackup(
  state: CollectionState,
  exportedAt: string,
): string {
  return `${JSON.stringify(createCollectionBackup(state, exportedAt), null, 2)}\n`;
}

export function collectionBackupFilename(exportedAt: string): string {
  const day = exportedAt.slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(day)) {
    return `sto-aegis-collection-${day}.json`;
  }
  try {
    return `sto-aegis-collection-${new Date(exportedAt).toISOString().slice(0, 10)}.json`;
  } catch {
    return "sto-aegis-collection.json";
  }
}

export function summarizeCollection(state: CollectionState): CollectionBackupSummary {
  return {
    accounts: state.accounts.length,
    captains: state.characters.length,
    items: state.entries.length,
    builds: state.loadouts.length,
  };
}

export function formatCollectionBackupSummary(
  summary: CollectionBackupSummary,
): string {
  return [
    countLabel(summary.accounts, "account", "accounts"),
    countLabel(summary.captains, "captain", "captains"),
    countLabel(summary.items, "collected item", "collected items"),
    countLabel(summary.builds, "build", "builds"),
  ].join(", ");
}

export function parseCollectionBackupJson(text: string): ParsedCollectionBackup {
  let raw: unknown;
  try {
    raw = JSON.parse(stripBom(text));
  } catch {
    throw new CollectionBackupError(
      "invalid-json",
      "That file is not valid JSON.",
    );
  }
  return parseCollectionBackup(raw);
}

export function parseCollectionBackup(raw: unknown): ParsedCollectionBackup {
  if (!raw || typeof raw !== "object") {
    throw notABackup();
  }

  const value = raw as {
    kind?: unknown;
    formatVersion?: unknown;
    exportedAt?: unknown;
    collection?: unknown;
  };

  if (value.kind === COLLECTION_BACKUP_KIND) {
    if (typeof value.formatVersion === "number" && value.formatVersion > COLLECTION_BACKUP_FORMAT) {
      throw new CollectionBackupError(
        "newer-format",
        "This backup was made with a newer version of STO-AEGIS Array.",
      );
    }
    if (
      value.formatVersion !== COLLECTION_BACKUP_FORMAT ||
      !isCollectionStateDocument(value.collection)
    ) {
      throw new CollectionBackupError(
        "unreadable",
        "The collection data in this backup could not be read.",
      );
    }
    return {
      state: hydrateCollectionState(value.collection),
      exportedAt: optionalTimestamp(value.exportedAt),
      source: "backup",
    };
  }

  if (!isCollectionStateDocument(raw)) {
    throw notABackup();
  }

  return {
    state: hydrateCollectionState(raw),
    exportedAt: null,
    source: "collection",
  };
}

export function collectionBackupFileError(err: unknown): string {
  if (err instanceof CollectionBackupError) return err.message;
  const name =
    err && typeof err === "object" && "name" in err ? String(err.name) : "";
  if (name === "QuotaExceededError") {
    return "This backup is too large for browser storage.";
  }
  return "Could not read that backup file.";
}

function isCollectionStateDocument(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const doc = value as {
    version?: unknown;
    characters?: unknown;
    entries?: unknown;
  };
  return (
    (doc.version === 1 || doc.version === 2 || doc.version === 3) &&
    Array.isArray(doc.characters) &&
    Array.isArray(doc.entries)
  );
}

function optionalTimestamp(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function stripBom(text: string): string {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

function notABackup(): CollectionBackupError {
  return new CollectionBackupError(
    "not-a-backup",
    "That file is not a STO-AEGIS Array collection backup.",
  );
}

function countLabel(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}
