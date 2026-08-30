/**
 * Wiki {{shipequip}} stores the hull’s included experimental weapon as heavy1.
 * Ships cargo only has a boolean experimental slot flag.
 */
export function extractIncludedExperimentalWeapon(
  wikitext: string | null | undefined,
): string | null {
  if (!wikitext) return null;
  return (
    shipequipParam(wikitext, "heavy1") ??
    itemAfterExperimentalWeaponSection(wikitext)
  );
}

function shipequipParam(wikitext: string, param: string): string | null {
  const block = templateBody(wikitext, "shipequip");
  if (!block) return null;
  const match = block.match(
    new RegExp(`\\|\\s*${param}\\s*=\\s*([^|}\\r\\n]+)`, "i"),
  );
  return cleanWikiName(match?.[1]);
}

function itemAfterExperimentalWeaponSection(wikitext: string): string | null {
  const marker = wikitext.search(/\{\{\s*Experimental Weapon\s*\}\}/i);
  if (marker < 0) return null;
  const rest = wikitext.slice(marker);
  const item = rest.match(/\{\{\s*item\s*\|\s*([^}|]+)/i);
  return cleanWikiName(item?.[1]);
}

function templateBody(wikitext: string, name: string): string | null {
  const start = wikitext.search(
    new RegExp(`\\{\\{\\s*${name}\\b`, "i"),
  );
  if (start < 0) return null;
  const fromOpen = wikitext.slice(start);
  const end = fromOpen.indexOf("}}");
  if (end < 0) return fromOpen;
  return fromOpen.slice(0, end);
}

function cleanWikiName(value: string | null | undefined): string | null {
  const name = value?.replace(/<!--.*?-->/g, "").trim();
  return name ? name : null;
}
