import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  catalogImageTargets,
  type CatalogImageSource,
} from "./wiki/imageTargets.js";
import { alignCatalogImageFiles } from "./wiki/localImageFiles.js";

async function readJson<T>(path: string): Promise<T | null> {
  try {
    return JSON.parse(await readFile(path, "utf8")) as T;
  } catch {
    return null;
  }
}

async function main() {
  const root = resolve(__dirname, "../..");
  const cargoDir = resolve(__dirname, "../output");
  const imagesDir = resolve(root, "VueUI/public/images");

  const ships =
    (await readJson<CatalogImageSource["ships"]>(resolve(cargoDir, "Ships.json"))) ??
    [];
  const traits =
    (await readJson<CatalogImageSource["traits"]>(resolve(cargoDir, "Traits.json"))) ??
    [];
  const starshipTraits =
    (await readJson<CatalogImageSource["starshipTraits"]>(
      resolve(cargoDir, "StarshipTraits.json"),
    )) ?? [];
  const infoboxes =
    (await readJson<Array<{ name: string; image?: string | null }>>(
      resolve(cargoDir, "Infobox.json"),
    )) ?? [];
  const traySkills =
    (await readJson<Array<{ name: string }>>(resolve(cargoDir, "TraySkill.json"))) ?? [];

  const targets = catalogImageTargets({
    ships,
    traits,
    starshipTraits,
    infoboxes,
    traySkills,
  });
  const { renamed, recased } = await alignCatalogImageFiles(imagesDir, targets);
  console.log(`Aligned ${renamed} of ${targets.length} catalog image files in ${imagesDir}`);
  for (const row of recased) {
    console.log(`Recased ${row.kind}/${row.from} -> ${row.to}`);
  }
}

void main();
