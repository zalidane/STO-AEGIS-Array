/**
 * Convert Special:CargoExport JSON into the shape written by
 * extractTable() from the MediaWiki cargoquery API.
 *
 * CargoExport returns a bare array, JSON numbers, and list fields as arrays.
 * cargoquery stores every value as a string (or null), with lists joined on
 * the field delimiter (a comma), including a trailing comma when the wiki
 * stored a trailing empty item. An empty list or a list of only empty items
 * is stored as null.
 */

export const PAGE_METADATA_FIELDS = new Set([
  "_pageName",
  "_pageTitle",
  "_pageID",
  "_pageId",
  "_pageid",
  "_pageNamespace",
  "_ID",
]);

/** Underscore Cargo names that cargoquery emits with spaces. */
export const FIELD_NAME_ALIASES: Record<string, string> = {
  icon_name: "icon name",
  short_description: "short description",
  char_variant: "char variant",
  boff_variant: "boff variant",
  doff_variant: "doff variant",
  description_long: "description long",
  recharge_base: "recharge base",
  recharge_global: "recharge global",
};

export const CARGO_LIST_DELIMITER = ",";

export type CargoValue = string | number | boolean | null | CargoValue[];
export type CargoRow = Record<string, CargoValue>;
export type StringCargoRow = Record<string, string | null>;

export function cargoFieldName(key: string): string | null {
  if (PAGE_METADATA_FIELDS.has(key)) return null;
  return FIELD_NAME_ALIASES[key] ?? key;
}

export function stringifyCargoValue(value: CargoValue): string | null {
  if (value === null) return null;
  if (Array.isArray(value)) {
    if (value.every((item) => item === null || item === "")) return null;
    return value
      .map((item) => (item === null ? "" : stringifyScalar(item)))
      .join(CARGO_LIST_DELIMITER);
  }
  return stringifyScalar(value);
}

function stringifyScalar(value: Exclude<CargoValue, CargoValue[] | null>): string {
  if (typeof value === "boolean") return value ? "1" : "0";
  if (typeof value === "number") return stringifyNumber(value);
  return value;
}

/** Match JSON/JS number-to-string (and JSON_NUMERIC_CHECK integers). */
function stringifyNumber(value: number): string {
  if (!Number.isFinite(value)) return String(value);
  if (Number.isInteger(value)) return String(value);
  return String(value);
}

export function convertCargoExportRow(
  row: CargoRow,
  fieldOrder?: readonly string[],
): StringCargoRow {
  const converted: StringCargoRow = {};
  for (const [key, value] of Object.entries(row)) {
    const name = cargoFieldName(key);
    if (name === null) continue;
    converted[name] = stringifyCargoValue(value);
  }

  if (!fieldOrder || fieldOrder.length === 0) return converted;

  const ordered: StringCargoRow = {};
  for (const key of fieldOrder) {
    ordered[key] = Object.prototype.hasOwnProperty.call(converted, key)
      ? (converted[key] ?? null)
      : null;
  }
  for (const [key, value] of Object.entries(converted)) {
    if (!Object.prototype.hasOwnProperty.call(ordered, key)) {
      ordered[key] = value;
    }
  }
  return ordered;
}

export function convertCargoExportRows(
  rows: readonly CargoRow[],
  fieldOrder?: readonly string[],
): StringCargoRow[] {
  return rows.map((row) => convertCargoExportRow(row, fieldOrder));
}

export type InfoboxStamp = {
  name: string;
  type?: string | null;
  image?: string | null;
};

export function infoboxStampKey(name: string, type: string | null | undefined): string {
  return `${name}\0${type ?? ""}`;
}

export function buildInfoboxImageStamps(
  committed: readonly InfoboxStamp[],
): Map<string, string | null> {
  const stamps = new Map<string, string | null>();
  for (const row of committed) {
    const key = infoboxStampKey(row.name, row.type);
    if (!stamps.has(key)) stamps.set(key, row.image ?? null);
  }
  return stamps;
}

export function applyInfoboxImageStamps(
  rows: readonly StringCargoRow[],
  stamps: ReadonlyMap<string, string | null>,
): StringCargoRow[] {
  return rows.map((row) => {
    const key = infoboxStampKey(String(row.name ?? ""), row.type);
    const image = stamps.has(key) ? (stamps.get(key) ?? null) : null;
    return { ...row, image };
  });
}

/** Same encoding as extractTable(): 2-space indent, no trailing newline. */
export function serializeCargoJson(rows: readonly StringCargoRow[]): string {
  return JSON.stringify(rows, null, 2);
}

export function fieldOrderFromCommitted(
  committed: readonly Record<string, unknown>[],
): string[] {
  const order: string[] = [];
  const seen = new Set<string>();
  for (const row of committed) {
    for (const key of Object.keys(row)) {
      if (seen.has(key)) continue;
      seen.add(key);
      order.push(key);
    }
  }
  return order;
}
