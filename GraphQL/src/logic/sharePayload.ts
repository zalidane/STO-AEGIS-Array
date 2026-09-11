import { createHash } from "node:crypto";

export const SHARE_SCHEMA_VERSION = 1;
export const MIN_PUBLIC_FILLS = 8;
export const PUBLIC_LIST_LIMIT = 10;
export const PUBLIC_LIST_WINDOW_MS = 24 * 60 * 60 * 1000;
export const BOTD_COOLDOWN_DAYS = 14;

export const SHARE_VISIBILITY = {
  unlisted: "unlisted",
  public: "public",
} as const;

export type ShareVisibility =
  (typeof SHARE_VISIBILITY)[keyof typeof SHARE_VISIBILITY];

export type ShareCatalogKind = "item" | "starshipTrait" | "traySkill" | "trait";

export type SharePlayableCareer = "Tactical" | "Engineering" | "Science";

export type ShareSlot = {
  slotId: string;
  catalogKind: ShareCatalogKind;
  name: string;
  type?: string | null;
  quality?: string;
  mark?: string;
  modifiers?: string[];
  abilityRank?: number;
};

export type SharePayload = {
  v: typeof SHARE_SCHEMA_VERSION;
  shipName: string;
  title: string;
  slots: ShareSlot[];
  boffSeatCareers?: Record<string, SharePlayableCareer>;
  boardPrefs?: ShareBoardPrefs;
};

export type ShareBoardPrefs = {
  hullUpgrade?: "full" | "x" | "u" | "stock";
  miracleWorkerConsole?: boolean;
  extraSlotDisplay?: "hide" | "lock";
  hideModifiers?: boolean;
};

export type ShareFillRow = {
  catalogKind: ShareCatalogKind;
  name: string;
  type: string;
  shipName: string;
  contentHash: string;
};

export type ParseShareFailure =
  | "not-object"
  | "unsupported-version"
  | "missing-ship"
  | "missing-title"
  | "bad-slots"
  | "bad-slot"
  | "bad-boff-careers";

export type ParseShareResult =
  | { ok: true; payload: SharePayload }
  | { ok: false; reason: ParseShareFailure };

const CATALOG_KINDS = new Set<ShareCatalogKind>([
  "item",
  "starshipTrait",
  "traySkill",
  "trait",
]);

const PLAYABLE_CAREERS = new Set<SharePlayableCareer>([
  "Tactical",
  "Engineering",
  "Science",
]);

export const SHARE_PAYLOAD_ERROR: Record<ParseShareFailure, string> = {
  "not-object": "Share snapshot is missing or is not an object.",
  "unsupported-version": "This share snapshot uses an unsupported version.",
  "missing-ship": "Share snapshot is missing the ship name.",
  "missing-title": "Share snapshot is missing a build title.",
  "bad-slots": "Share snapshot slots are missing or not a list.",
  "bad-slot":
    "A seated slot is missing a wiki name, uses an unknown catalog kind, or is duplicated.",
  "bad-boff-careers":
    "Bridge officer seat careers are missing, duplicated, or not Tactical, Engineering, or Science.",
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function optionalString(value: unknown): string | undefined {
  if (value == null) return undefined;
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function parseModifiers(value: unknown): string[] | null | undefined {
  if (value == null) return undefined;
  if (!Array.isArray(value)) return null;
  const modifiers: string[] = [];
  for (const entry of value) {
    if (typeof entry !== "string") return null;
    const token = entry.trim();
    if (token) modifiers.push(token);
  }
  return modifiers.length > 0 ? modifiers : undefined;
}

function parseAbilityRank(value: unknown): number | null | undefined {
  if (value == null) return undefined;
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    return null;
  }
  return value;
}

function parseBoardPrefs(value: unknown): ShareBoardPrefs | undefined {
  if (value == null) return undefined;
  const row = asRecord(value);
  if (!row) return undefined;
  const prefs: ShareBoardPrefs = {};
  if (
    row.hullUpgrade === "full" ||
    row.hullUpgrade === "x" ||
    row.hullUpgrade === "u" ||
    row.hullUpgrade === "stock"
  ) {
    prefs.hullUpgrade = row.hullUpgrade;
  }
  if (typeof row.miracleWorkerConsole === "boolean") {
    prefs.miracleWorkerConsole = row.miracleWorkerConsole;
  }
  if (row.extraSlotDisplay === "hide" || row.extraSlotDisplay === "lock") {
    prefs.extraSlotDisplay = row.extraSlotDisplay;
  }
  if (typeof row.hideModifiers === "boolean") {
    prefs.hideModifiers = row.hideModifiers;
  }
  return Object.keys(prefs).length > 0 ? prefs : undefined;
}

function parseBoffSeatCareers(
  value: unknown,
): Record<string, SharePlayableCareer> | null | undefined {
  if (value == null) return undefined;
  const row = asRecord(value);
  if (!row) return null;
  const careers: Record<string, SharePlayableCareer> = {};
  for (const [key, career] of Object.entries(row)) {
    if (!key.trim()) return null;
    if (typeof career !== "string" || !PLAYABLE_CAREERS.has(career as SharePlayableCareer)) {
      return null;
    }
    careers[key] = career as SharePlayableCareer;
  }
  return Object.keys(careers).length > 0 ? careers : undefined;
}

function parseSlot(value: unknown): ShareSlot | null {
  const row = asRecord(value);
  if (!row) return null;
  if (typeof row.slotId !== "string" || row.slotId.trim().length === 0) {
    return null;
  }
  if (
    typeof row.catalogKind !== "string" ||
    !CATALOG_KINDS.has(row.catalogKind as ShareCatalogKind)
  ) {
    return null;
  }
  const catalogKind = row.catalogKind as ShareCatalogKind;
  if (typeof row.name !== "string" || row.name.trim().length === 0) {
    return null;
  }
  const modifiers = parseModifiers(row.modifiers);
  if (modifiers === null) return null;
  const abilityRank = parseAbilityRank(row.abilityRank);
  if (abilityRank === null) return null;
  const slot: ShareSlot = {
    slotId: row.slotId.trim(),
    catalogKind,
    name: row.name.trim(),
  };
  const type = optionalString(row.type);
  if (type !== undefined) slot.type = type;
  const quality = optionalString(row.quality);
  if (quality !== undefined) slot.quality = quality;
  const mark = optionalString(row.mark);
  if (mark !== undefined) slot.mark = mark;
  if (modifiers) slot.modifiers = modifiers;
  if (abilityRank !== undefined) slot.abilityRank = abilityRank;
  return slot;
}

export function parseSharePayload(raw: unknown): ParseShareResult {
  const value = asRecord(raw);
  if (!value) return { ok: false, reason: "not-object" };
  if (value.v !== SHARE_SCHEMA_VERSION) {
    return { ok: false, reason: "unsupported-version" };
  }
  if (typeof value.shipName !== "string" || value.shipName.trim().length === 0) {
    return { ok: false, reason: "missing-ship" };
  }
  if (typeof value.title !== "string" || value.title.trim().length === 0) {
    return { ok: false, reason: "missing-title" };
  }
  if (!Array.isArray(value.slots)) return { ok: false, reason: "bad-slots" };

  const slots: ShareSlot[] = [];
  const seen = new Set<string>();
  for (const entry of value.slots) {
    const slot = parseSlot(entry);
    if (!slot) return { ok: false, reason: "bad-slot" };
    if (seen.has(slot.slotId)) return { ok: false, reason: "bad-slot" };
    seen.add(slot.slotId);
    slots.push(slot);
  }

  const boffSeatCareers = parseBoffSeatCareers(value.boffSeatCareers);
  if (boffSeatCareers === null) {
    return { ok: false, reason: "bad-boff-careers" };
  }
  const boardPrefs = parseBoardPrefs(value.boardPrefs);

  return {
    ok: true,
    payload: {
      v: SHARE_SCHEMA_VERSION,
      shipName: value.shipName.trim(),
      title: value.title.trim(),
      slots,
      ...(boffSeatCareers ? { boffSeatCareers } : {}),
      ...(boardPrefs ? { boardPrefs } : {}),
    },
  };
}

function canonicalSlots(slots: readonly ShareSlot[]) {
  return [...slots]
    .map((slot) => ({
      slotId: slot.slotId,
      catalogKind: slot.catalogKind,
      name: slot.name,
      type: slot.type ?? "",
      quality: slot.quality ?? "",
      mark: slot.mark ?? "",
      modifiers: slot.modifiers ?? [],
      abilityRank: slot.abilityRank ?? null,
    }))
    .sort((a, b) => a.slotId.localeCompare(b.slotId));
}

function canonicalBoffSeatCareers(
  careers: SharePayload["boffSeatCareers"],
): Record<string, SharePlayableCareer> {
  if (!careers) return {};
  return Object.fromEntries(
    Object.entries(careers).sort(([left], [right]) => left.localeCompare(right)),
  );
}

/** Stable hash of seated gear. Title is decoration and is ignored. */
export function contentHashFromPayload(payload: SharePayload): string {
  const canonical = JSON.stringify({
    v: payload.v,
    shipName: payload.shipName,
    slots: canonicalSlots(payload.slots),
    boffSeatCareers: canonicalBoffSeatCareers(payload.boffSeatCareers),
  });
  return createHash("sha256").update(canonical).digest("hex").slice(0, 32);
}

export function fillCount(payload: SharePayload): number {
  return payload.slots.length;
}

export function isEligibleForPublic(payload: SharePayload): boolean {
  return fillCount(payload) >= MIN_PUBLIC_FILLS;
}

export function fillsFromPayload(
  payload: SharePayload,
  contentHash: string,
): ShareFillRow[] {
  const unique = new Map<string, ShareFillRow>();
  for (const slot of payload.slots) {
    if (!CATALOG_KINDS.has(slot.catalogKind)) continue;
    const type = slot.type?.trim() ?? "";
    const key = `${slot.catalogKind}\0${slot.name}\0${type}`;
    if (unique.has(key)) continue;
    unique.set(key, {
      catalogKind: slot.catalogKind,
      name: slot.name,
      type,
      shipName: payload.shipName,
      contentHash,
    });
  }
  return [...unique.values()];
}

export function utcDateString(at: Date): string {
  return at.toISOString().slice(0, 10);
}

export function pickFeaturedBuildId(
  eligibleIds: readonly string[],
  at: Date,
): string | null {
  if (eligibleIds.length === 0) return null;
  const sorted = [...eligibleIds].sort();
  const digest = createHash("sha256")
    .update(`botd:${utcDateString(at)}`)
    .digest("hex");
  const index = Number.parseInt(digest.slice(0, 8), 16) % sorted.length;
  return sorted[index] ?? null;
}

export function wasFeaturedRecently(
  featuredDates: readonly string[],
  at: Date,
  cooldownDays = BOTD_COOLDOWN_DAYS,
): boolean {
  const today = Date.parse(`${utcDateString(at)}T00:00:00.000Z`);
  const windowStart = today - cooldownDays * 24 * 60 * 60 * 1000;
  return featuredDates.some((isoDate) => {
    const stamp = Date.parse(`${isoDate}T00:00:00.000Z`);
    return Number.isFinite(stamp) && stamp >= windowStart && stamp < today;
  });
}

export function publicListCountInWindow(
  listedAt: readonly Date[],
  at: Date,
  windowMs = PUBLIC_LIST_WINDOW_MS,
): number {
  const start = at.getTime() - windowMs;
  return listedAt.filter((stamp) => stamp.getTime() >= start).length;
}

export function isPublicListRateLimited(
  listedAt: readonly Date[],
  at: Date,
): boolean {
  return publicListCountInWindow(listedAt, at) >= PUBLIC_LIST_LIMIT;
}
