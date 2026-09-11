import { decodeHtmlEntities } from "@/utils/decodeHtmlEntities";
import { itemFitsSlot, itemSlotClassesFromType } from "./slotClass";
import type {
  CollectionLoadout,
  LoadoutCatalogKind,
  LoadoutItem,
  LoadoutSlotFill,
} from "./types";

export type SetBonusSource = {
  id: number;
  name: string;
  setPage?: string | null;
  reqItems: number | null;
  passives: string | null;
  procs?: string | null;
  /** Newline or semicolon-separated item name globs. */
  members?: string | null;
};

export type SetBonusItem = Pick<LoadoutItem, "name" | "who"> & {
  type?: string | null;
};

export type ActiveSetBonus = {
  id: number;
  name: string;
  equipped: number;
  required: number;
  complete: boolean;
  passives: string | null;
  pieces: string[];
  missing: string[];
};

const MIN_SET_NAME_LENGTH = 6;
const DEFAULT_NAMED_SET_SIZE = 3;
const GENERIC_PREFIX_WORDS = new Set([
  "console",
  "universal",
  "tactical",
  "engineering",
  "science",
  "kit",
  "module",
]);

function catalogByKey(
  items: ReadonlyArray<LoadoutItem>,
): Map<string, LoadoutItem> {
  return new Map(
    items.map((item) => [
      loadoutOwnershipKey(item.catalogKind, item.id),
      item,
    ]),
  );
}

export function seatedLoadoutItems(
  loadout: CollectionLoadout | null | undefined,
  items: ReadonlyArray<LoadoutItem>,
): LoadoutItem[] {
  if (!loadout) return [];
  const byKey = catalogByKey(items);
  return loadout.slots
    .map((fill) => byKey.get(loadoutOwnershipKey(fill.catalogKind, fill.itemId)))
    .filter((item): item is LoadoutItem => item != null);
}

export function equippedItemsForLoadout(
  loadout: CollectionLoadout | null | undefined,
  items: ReadonlyArray<LoadoutItem>,
): LoadoutItem[] {
  return seatedLoadoutItems(loadout, items).filter(
    (item) => (item.catalogKind ?? "item") === "item",
  );
}

export function itemBelongsToSet(itemName: string, setName: string): boolean {
  const item = itemName.trim().toLowerCase();
  const set = setName.trim().toLowerCase();
  if (!item || set.length < MIN_SET_NAME_LENGTH) return false;
  return item.includes(set);
}

export function shortSetPieceName(name: string): string {
  return decodeHtmlEntities(name)
    .replace(/\s+/g, " ")
    .trim()
    .replace(
      /^Console\s*-\s*(?:Universal|Tactical|Engineering|Science)\s*-\s*/i,
      "",
    )
    .replace(/\s+Mk\s+[IVX∞0-9]+.*$/i, "");
}

function isUniversalConsoleItem(item: Pick<SetBonusItem, "type">): boolean {
  return itemSlotClassesFromType(item.type).includes("universalConsole");
}

function normalizeWhoKey(who: string | null | undefined): string | null {
  if (!who) return null;
  const value = decodeHtmlEntities(who).replace(/\s+/g, " ").trim();
  return value.length > 0 ? value.toLowerCase() : null;
}

function setNameFromWho(who: string): string {
  return decodeHtmlEntities(who)
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^Equippable on /i, "")
    .replace(/^(Any|All) /i, "");
}

function stripItemNameForSet(name: string): string {
  return decodeHtmlEntities(name)
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\s+Mk\s+[IVX∞0-9]+.*$/i, "")
    .replace(
      /^Console\s*-\s*(?:Universal|Tactical|Engineering|Science)\s*-\s*/i,
      "",
    );
}

function commonWordPrefix(left: string, right: string): string {
  const leftWords = left.split(" ").filter(Boolean);
  const rightWords = right.split(" ").filter(Boolean);
  const shared: string[] = [];
  for (let i = 0; i < Math.min(leftWords.length, rightWords.length); i += 1) {
    if (leftWords[i]!.toLowerCase() !== rightWords[i]!.toLowerCase()) break;
    shared.push(leftWords[i]!);
  }
  return shared.join(" ");
}

function isUsefulSetPrefix(prefix: string): boolean {
  const words = prefix.split(" ").filter(Boolean);
  if (prefix.length < MIN_SET_NAME_LENGTH || words.length < 2) return false;
  const distinctive = words.filter(
    (word) => !GENERIC_PREFIX_WORDS.has(word.toLowerCase()),
  );
  return distinctive.length >= 2;
}

function inferredSetId(kind: string, label: string): number {
  const input = `${kind}:${label.toLowerCase()}`;
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash === 0 ? -1 : -Math.abs(hash | 0);
}

function bonusText(set: SetBonusSource): string | null {
  const parts = [set.passives, set.procs]
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value));
  return parts.length > 0 ? parts.join("\n") : null;
}

function stripMarkSuffix(name: string): string {
  return decodeHtmlEntities(name)
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\s+Mk\s+[IVX∞0-9]+.*$/i, "");
}

export function parseSetMembers(members: string | null | undefined): string[] {
  if (!members?.trim()) return [];
  return members
    .split(/\r?\n|;/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Glob-style member match (`*` = any run of characters). Ignores Mk suffixes. */
export function itemMatchesMemberPattern(
  itemName: string,
  pattern: string,
): boolean {
  const item = stripMarkSuffix(itemName).toLowerCase();
  const glob = decodeHtmlEntities(pattern).replace(/\s+/g, " ").trim().toLowerCase();
  if (!glob) return false;
  if (!glob.includes("*")) {
    return item === glob || item.startsWith(`${glob} `);
  }
  const regex = new RegExp(
    `^${escapeRegex(glob).replace(/\\\*/g, ".*")}$`,
    "i",
  );
  return regex.test(item);
}

function itemMatchesSet(itemName: string, set: SetBonusSource): boolean {
  const patterns = parseSetMembers(set.members);
  if (patterns.length > 0) {
    return patterns.some((pattern) =>
      itemMatchesMemberPattern(itemName, pattern),
    );
  }
  return (
    itemBelongsToSet(itemName, set.name) ||
    (set.setPage != null && itemBelongsToSet(itemName, set.setPage))
  );
}

function matchSetPieces(
  equipped: ReadonlyArray<SetBonusItem>,
  set: SetBonusSource,
): { pieces: string[]; missing: string[] } {
  const patterns = parseSetMembers(set.members);
  if (patterns.length === 0) {
    const pieces = equipped
      .filter((item) => itemMatchesSet(item.name, set))
      .map((item) => item.name);
    return { pieces, missing: [] };
  }

  const remaining = [...equipped];
  const pieces: string[] = [];
  const missing: string[] = [];
  for (const pattern of patterns) {
    const index = remaining.findIndex((item) =>
      itemMatchesMemberPattern(item.name, pattern),
    );
    if (index < 0) {
      missing.push(pattern.replace(/\*/g, "").replace(/\s+/g, " ").trim());
      continue;
    }
    pieces.push(remaining[index]!.name);
    remaining.splice(index, 1);
  }
  return { pieces, missing };
}

function setGroupKey(set: SetBonusSource): string {
  const page = set.setPage?.trim();
  if (page) return page.toLowerCase();
  return set.name.trim().toLowerCase();
}

function cargoSetBonuses(
  equipped: ReadonlyArray<SetBonusItem>,
  sets: ReadonlyArray<SetBonusSource>,
): ActiveSetBonus[] {
  const groups = new Map<string, SetBonusSource[]>();
  for (const set of sets) {
    const key = setGroupKey(set);
    const group = groups.get(key) ?? [];
    group.push(set);
    groups.set(key, group);
  }

  const results: ActiveSetBonus[] = [];
  for (const group of groups.values()) {
    const primary =
      group.find((row) => parseSetMembers(row.members).length > 0) ?? group[0]!;
    const { pieces, missing } = matchSetPieces(equipped, primary);
    const equippedCount = pieces.length;
    if (equippedCount < 2) continue;

    const required = Math.max(
      ...group.map((row) =>
        row.reqItems != null && row.reqItems > 0
          ? row.reqItems
          : DEFAULT_NAMED_SET_SIZE,
      ),
    );
    const distinctNames = new Set(
      group.map((row) => row.name.trim().toLowerCase()).filter(Boolean),
    );
    const prefixLabels = distinctNames.size > 1;

    function rowNeed(row: SetBonusSource): number {
      return row.reqItems != null && row.reqItems > 0 ? row.reqItems : 2;
    }

    let unlockedRows = group.filter((row) => equippedCount >= rowNeed(row));
    if (unlockedRows.length === 0) {
      const preview = [...group]
        .filter((row) => bonusText(row))
        .sort((left, right) => rowNeed(left) - rowNeed(right))[0];
      if (preview) unlockedRows = [preview];
    }

    const unlocked: string[] = [];
    const seenText = new Set<string>();
    for (const row of unlockedRows) {
      const text = bonusText(row);
      if (!text) continue;
      const label = row.name.trim();
      const page = (row.setPage ?? "").trim();
      const formatted =
        prefixLabels && page && label.toLowerCase() !== page.toLowerCase()
          ? `${label}: ${text}`
          : text;
      if (seenText.has(formatted)) continue;
      seenText.add(formatted);
      unlocked.push(formatted);
    }

    results.push({
      id: primary.id,
      name: primary.setPage?.trim() || primary.name,
      equipped: equippedCount,
      required,
      complete: equippedCount >= required,
      passives: unlocked.length > 0 ? unlocked.join("\n") : null,
      pieces,
      missing,
    });
  }
  return results;
}

function sortSetBonuses(sets: ActiveSetBonus[]): ActiveSetBonus[] {
  return [...sets].sort(
    (a, b) => b.equipped - a.equipped || a.name.localeCompare(b.name),
  );
}

function whoSetBonuses(
  equipped: ReadonlyArray<SetBonusItem>,
  catalog: ReadonlyArray<SetBonusItem>,
): ActiveSetBonus[] {
  const seatedByWho = new Map<string, SetBonusItem[]>();
  for (const item of equipped) {
    if (!isUniversalConsoleItem(item)) continue;
    const key = normalizeWhoKey(item.who);
    if (!key) continue;
    const group = seatedByWho.get(key) ?? [];
    group.push(item);
    seatedByWho.set(key, group);
  }

  const results: ActiveSetBonus[] = [];
  for (const [whoKey, seated] of seatedByWho) {
    if (seated.length < 2) continue;
    const sampleWho = seated[0]!.who!;
    const catalogPieces = catalog.filter(
      (item) =>
        isUniversalConsoleItem(item) && normalizeWhoKey(item.who) === whoKey,
    );
    const seatedNames = new Set(seated.map((item) => item.name));
    const missing = catalogPieces
      .map((item) => item.name)
      .filter((name) => !seatedNames.has(name));
    const required =
      catalogPieces.length >= 2
        ? catalogPieces.length
        : Math.max(DEFAULT_NAMED_SET_SIZE, seated.length);
    results.push({
      id: inferredSetId("who", whoKey),
      name: setNameFromWho(sampleWho),
      equipped: seated.length,
      required,
      complete: seated.length >= required,
      passives: null,
      pieces: seated.map((item) => item.name),
      missing,
    });
  }
  return results;
}

function namePrefixSetBonuses(
  equipped: ReadonlyArray<SetBonusItem>,
  claimedNames: ReadonlySet<string>,
): ActiveSetBonus[] {
  const remaining = equipped.filter((item) => !claimedNames.has(item.name));
  if (remaining.length < 2) return [];

  const stripped = remaining.map((item) => ({
    item,
    stripped: stripItemNameForSet(item.name),
  }));

  const prefixByName = new Map<string, string>();
  for (const current of stripped) {
    let best = "";
    for (const other of stripped) {
      if (other.item.name === current.item.name) continue;
      const prefix = commonWordPrefix(current.stripped, other.stripped);
      if (isUsefulSetPrefix(prefix) && prefix.length > best.length) {
        best = prefix;
      }
    }
    if (best) prefixByName.set(current.item.name, best);
  }

  const grouped = new Map<string, SetBonusItem[]>();
  for (const item of remaining) {
    const prefix = prefixByName.get(item.name);
    if (!prefix) continue;
    const group = grouped.get(prefix) ?? [];
    group.push(item);
    grouped.set(prefix, group);
  }

  const results: ActiveSetBonus[] = [];
  for (const [prefix, pieces] of grouped) {
    if (pieces.length < 2) continue;
    const required = Math.max(DEFAULT_NAMED_SET_SIZE, pieces.length);
    results.push({
      id: inferredSetId("name", prefix),
      name: prefix,
      equipped: pieces.length,
      required,
      complete: pieces.length >= required,
      passives: null,
      pieces: pieces.map((item) => item.name),
      missing: [],
    });
  }
  return results;
}

function namesCoveredByCargo(
  cargo: ReadonlyArray<ActiveSetBonus>,
): Set<string> {
  return new Set(cargo.flatMap((set) => set.pieces));
}

/**
 * Match seated items to set bonuses.
 * Wiki cargo is sparse, so unique consoles that share a who-restriction
 * and items that share a distinctive name prefix are inferred locally.
 * Supplement `members` globs match packs whose names do not include the set page.
 */
export function matchSetBonuses(
  equipped: ReadonlyArray<SetBonusItem>,
  sets: ReadonlyArray<SetBonusSource>,
  catalog: ReadonlyArray<SetBonusItem> = [],
): ActiveSetBonus[] {
  const cargo = cargoSetBonuses(equipped, sets);
  const claimed = namesCoveredByCargo(cargo);
  const fromWho = whoSetBonuses(equipped, catalog).filter(
    (set) => !set.pieces.every((name) => claimed.has(name)),
  );
  for (const set of fromWho) {
    for (const name of set.pieces) claimed.add(name);
  }
  const fromPrefix = namePrefixSetBonuses(equipped, claimed);
  return sortSetBonuses([...cargo, ...fromWho, ...fromPrefix]);
}

export function isUniqueLimited(item: Pick<LoadoutItem, "equiplimit">): boolean {
  return item.equiplimit != null && item.equiplimit > 0;
}

/** One copy per loadout: personal traits, starship traits, and universal consoles. */
export function isForcedUniqueItem(
  item: Pick<LoadoutItem, "type" | "catalogKind">,
): boolean {
  const kind = item.catalogKind ?? "item";
  if (kind === "trait" || kind === "starshipTrait") return true;
  return itemSlotClassesFromType(item.type).includes("universalConsole");
}

export function loadoutOwnershipKey(
  catalogKind: LoadoutCatalogKind | undefined,
  itemId: number,
): string {
  return `${catalogKind ?? "item"}:${itemId}`;
}

export function fillCatalogKind(
  fill: Pick<LoadoutSlotFill, "catalogKind">,
): LoadoutCatalogKind {
  return fill.catalogKind ?? "item";
}

export function copiesAllowed(
  item: Pick<LoadoutItem, "equiplimit" | "type" | "catalogKind">,
): number {
  if (isForcedUniqueItem(item)) return 1;
  if (!isUniqueLimited(item)) return Number.POSITIVE_INFINITY;
  return item.equiplimit!;
}

export function countCopiesInLoadout(
  loadout: CollectionLoadout,
  itemId: number,
  exceptSlotId?: string,
  catalogKind: LoadoutCatalogKind = "item",
): number {
  return loadout.slots.filter(
    (fill) =>
      fill.itemId === itemId &&
      fillCatalogKind(fill) === catalogKind &&
      fill.slotId !== exceptSlotId,
  ).length;
}

export function itemHasOpenCopy(
  item: Pick<LoadoutItem, "id" | "equiplimit" | "type" | "catalogKind">,
  fills: ReadonlyArray<Pick<LoadoutSlotFill, "slotId" | "itemId" | "catalogKind">>,
  exceptSlotId?: string,
): boolean {
  const allowed = copiesAllowed(item);
  if (!Number.isFinite(allowed)) return true;
  const kind = item.catalogKind ?? "item";
  const seated = fills.filter(
    (fill) =>
      fill.itemId === item.id &&
      fillCatalogKind(fill) === kind &&
      fill.slotId !== exceptSlotId,
  ).length;
  return seated < allowed;
}

export function itemFitsHullSlot(
  item: Pick<LoadoutItem, "type">,
  slotKind: Parameters<typeof itemFitsSlot>[1],
): boolean {
  return itemFitsSlot(item.type, slotKind);
}
