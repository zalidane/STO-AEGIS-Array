import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import type { WikiClient } from "../wiki/client.js";
import { extractIncludedExperimentalWeapon } from "../utils/shipequip.js";
import { decodeHtmlEntities } from "../utils/decodeHtmlEntities.js";

export const SHIP_EXPERIMENTAL_WEAPONS_PATH =
  "output/ShipExperimentalWeapons.json";

export type ExperimentalWeaponMap = Record<string, string | null>;

type ShipCargoRow = {
  name?: string | null;
  experimental?: string | boolean | number | null;
};

export function isExperimentalShip(row: ShipCargoRow): boolean {
  const value = row.experimental;
  if (value === true || value === 1) return true;
  if (typeof value !== "string") return false;
  const normalized = value.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes";
}

export async function extractShipExperimentalWeapons(
  wiki: WikiClient,
  options: { force?: boolean; shipsPath?: string; outputPath?: string } = {},
): Promise<ExperimentalWeaponMap> {
  const shipsPath = options.shipsPath ?? "output/Ships.json";
  const outputPath = options.outputPath ?? SHIP_EXPERIMENTAL_WEAPONS_PATH;
  const ships = await readJsonArray<ShipCargoRow>(shipsPath);
  const existing = await readWeaponMap(outputPath);
  const needed = ships.filter((ship) => {
    const name = decodeHtmlEntities(ship.name?.trim() ?? "");
    if (!name || !isExperimentalShip(ship)) return false;
    if (options.force) return true;
    return !Object.prototype.hasOwnProperty.call(existing, name);
  });

  const next: ExperimentalWeaponMap = { ...existing };
  if (needed.length === 0) {
    console.log(
      `ShipExperimentalWeapons: ${Object.keys(next).length} cached, nothing new to fetch`,
    );
    await writeFile(outputPath, `${JSON.stringify(next, null, 2)}\n`);
    return next;
  }

  console.log(
    `ShipExperimentalWeapons: fetching wikitext for ${needed.length} experimental hulls`,
  );
  const titles = needed.map((ship) => decodeHtmlEntities(ship.name!.trim()));
  const pages = await wiki.pageWikitext(titles);
  let found = 0;
  for (const ship of needed) {
    const name = decodeHtmlEntities(ship.name!.trim());
    const text = pages.get(name) ?? pages.get(ship.name!.trim()) ?? null;
    const weapon = extractIncludedExperimentalWeapon(text);
    next[name] = weapon;
    if (weapon) found += 1;
  }

  await writeFile(outputPath, `${JSON.stringify(next, null, 2)}\n`);
  console.log(
    `ShipExperimentalWeapons: saved ${Object.keys(next).length} hulls (${found} with a named weapon this fetch)`,
  );
  return next;
}

export async function loadExperimentalWeaponMap(
  path = SHIP_EXPERIMENTAL_WEAPONS_PATH,
): Promise<ExperimentalWeaponMap> {
  return readWeaponMap(path);
}

async function readWeaponMap(path: string): Promise<ExperimentalWeaponMap> {
  if (!existsSync(path)) return {};
  try {
    const parsed: unknown = JSON.parse(await readFile(path, "utf8"));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }
    const map: ExperimentalWeaponMap = {};
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      const weapon = typeof value === "string" ? value : value === null ? null : undefined;
      if (weapon === undefined) continue;
      map[key] = weapon;
      const decoded = decodeHtmlEntities(key);
      if (decoded !== key) map[decoded] = weapon;
    }
    return map;
  } catch {
    return {};
  }
}

async function readJsonArray<T>(path: string): Promise<T[]> {
  if (!existsSync(path)) return [];
  const parsed: unknown = JSON.parse(await readFile(path, "utf8"));
  return Array.isArray(parsed) ? (parsed as T[]) : [];
}
