import {
  currencyDisplayLabel,
  parseShipCost,
} from "@/utils/parsers/shipCost";

/** Selectable acquisition filter option for the Advanced Ship Search UI. */
export type AcquisitionSelectItem = {
  title: string;
  value: string;
};

/** Vuetify list item that can be a value, divider, or subheader. */
export type AcquisitionSelectListItem =
  | AcquisitionSelectItem
  | { type: "divider"; title?: string; value?: string }
  | { type: "subheader"; title: string; value?: string };

export type AcquisitionPrimaryKind =
  | "lobi"
  | "zen"
  | "lockBox"
  | "phoenix"
  | "prizePack";

const PRIMARY_KIND_ORDER: readonly AcquisitionPrimaryKind[] = [
  "lobi",
  "zen",
  "lockBox",
  "phoenix",
  "prizePack",
] as const;

function normalizeCode(code: string): string {
  return code.trim().toLowerCase();
}

/**
 * Classify primary acquisition methods used in the top group of the filter.
 * Returns null for secondary methods (fleet, requisition, dilithium, etc.).
 */
export function classifyAcquisitionPrimary(
  code: string,
): AcquisitionPrimaryKind | null {
  const normalized = normalizeCode(code);
  if (!normalized) return null;

  if (normalized === "lc") return "lobi";
  if (normalized === "zen") return "zen";
  if (normalized === "lb") return "lockBox";

  // Phoenix prize-pack tokens (PPP5 / PPPS and any Phoenix-labeled code).
  const label = currencyDisplayLabel(code);
  if (
    normalized === "ppp5" ||
    normalized === "ppps" ||
    /phoenix/i.test(label) ||
    /phoenix/i.test(code)
  ) {
    return "phoenix";
  }

  // Other prize packs (Anniversary, icon packs, Infinity-style packs).
  if (
    normalized === "app" ||
    /iconpack/i.test(code) ||
    (/prize\s*pack/i.test(label) && !/phoenix/i.test(label))
  ) {
    return "prizePack";
  }

  return null;
}

function compareByLabel(a: string, b: string): number {
  return currencyDisplayLabel(a).localeCompare(currencyDisplayLabel(b));
}

function toSelectItem(code: string): AcquisitionSelectItem {
  return {
    title: currencyDisplayLabel(code),
    value: code,
  };
}

/**
 * Build Acquisition filter items with:
 * 1. Primary block — Lobi, Zen, Lock Box, Phoenix, then prize packs A→Z
 * 2. Divider
 * 3. Remaining acquisition codes A→Z by display label
 *
 * Only codes present in `codes` are included. Primary codes keep relative
 * primary order even when some are missing from the catalog.
 */
export function buildAcquisitionSelectItems(
  codes: readonly string[],
): AcquisitionSelectListItem[] {
  const unique = [...new Set(codes.map((code) => code.trim()).filter(Boolean))];

  const primaryByKind = new Map<AcquisitionPrimaryKind, string[]>();
  const secondary: string[] = [];

  for (const code of unique) {
    const kind = classifyAcquisitionPrimary(code);
    if (!kind) {
      secondary.push(code);
      continue;
    }
    const bucket = primaryByKind.get(kind) ?? [];
    bucket.push(code);
    primaryByKind.set(kind, bucket);
  }

  const primaryOrdered: string[] = [];
  for (const kind of PRIMARY_KIND_ORDER) {
    const bucket = primaryByKind.get(kind);
    if (!bucket?.length) continue;
    if (kind === "prizePack" || kind === "phoenix") {
      primaryOrdered.push(...[...bucket].sort(compareByLabel));
    } else {
      // Single-code kinds (Lobi / Zen / Lock Box); keep stable alpha if duplicates.
      primaryOrdered.push(...[...bucket].sort(compareByLabel));
    }
  }

  secondary.sort(compareByLabel);

  const items: AcquisitionSelectListItem[] = primaryOrdered.map(toSelectItem);

  if (primaryOrdered.length > 0 && secondary.length > 0) {
    items.push({ type: "divider" });
  }

  for (const code of secondary) {
    items.push(toSelectItem(code));
  }

  return items;
}

/** Unique currency codes from ship cost strings, unsorted. */
export function collectAcquisitionCodes(
  sources: readonly { cost?: string | null }[],
): string[] {
  const codes = new Set<string>();
  for (const source of sources) {
    for (const part of parseShipCost(source.cost)) {
      if (part.currencyCode) codes.add(part.currencyCode);
    }
  }
  return [...codes];
}
