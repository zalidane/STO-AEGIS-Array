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

export type ShareCatalogKind = "item" | "starshipTrait";

export type ShareSlot = {
  slotId: string;
  catalogKind: ShareCatalogKind;
  name: string;
  type?: string | null;
  quality?: string;
  mark?: string;
};

export type SharePayload = {
  v: typeof SHARE_SCHEMA_VERSION;
  shipName: string;
  title: string;
  slots: ShareSlot[];
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
  | "bad-slot";

export type ParseShareResult =
  | { ok: true; payload: SharePayload }
  | { ok: false; reason: ParseShareFailure };

const CATALOG_KINDS = new Set<ShareCatalogKind>(["item", "starshipTrait"]);

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

function parseSlot(value: unknown): ShareSlot | null {
  const row = asRecord(value);
  if (!row) return null;
  if (typeof row.slotId !== "string" || row.slotId.trim().length === 0) {
    return null;
  }
  if (row.catalogKind !== "item" && row.catalogKind !== "starshipTrait") {
    return null;
  }
  if (typeof row.name !== "string" || row.name.trim().length === 0) {
    return null;
  }
  const slot: ShareSlot = {
    slotId: row.slotId.trim(),
    catalogKind: row.catalogKind,
    name: row.name.trim(),
  };
  const type = optionalString(row.type);
  if (type !== undefined) slot.type = type;
  const quality = optionalString(row.quality);
  if (quality !== undefined) slot.quality = quality;
  const mark = optionalString(row.mark);
  if (mark !== undefined) slot.mark = mark;
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

  return {
    ok: true,
    payload: {
      v: SHARE_SCHEMA_VERSION,
      shipName: value.shipName.trim(),
      title: value.title.trim(),
      slots,
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
    }))
    .sort((a, b) => a.slotId.localeCompare(b.slotId));
}

/** Stable hash of seated gear. Title is decoration and is ignored. */
export function contentHashFromPayload(payload: SharePayload): string {
  const canonical = JSON.stringify({
    v: payload.v,
    shipName: payload.shipName,
    slots: canonicalSlots(payload.slots),
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
