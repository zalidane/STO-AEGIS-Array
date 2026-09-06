import {
  careerLabel,
  factionLabel,
  raceLabel,
  specializationLabel,
} from "@/logic/captain/identity";
import { asBoffPower } from "@/logic/loadout/catalogMap";
import {
  boffPowerDisplayName,
  canonicalOfficerRank,
  type BoffOfficerRank,
  type BoffStation,
} from "@/logic/loadout/boffPowers";
import {
  fillForCaptainSlot,
  type CaptainTraitFill,
  type CaptainTraitGroup,
  type CaptainTraitSlot,
} from "@/logic/loadout/captainTraits";
import {
  groupHullSlots,
  type HullSlot,
  type HullSlotGroup,
} from "@/logic/loadout/hullSlots";
import { loadoutOwnershipKey, type ActiveSetBonus } from "@/logic/loadout/setBonus";
import { displayedMark, slotUsesItemMods } from "@/logic/loadout/slotQuality";
import { fillForSlot } from "@/logic/loadout/state";
import type {
  CollectionLoadout,
  LoadoutItem,
  LoadoutSlotFill,
} from "@/logic/loadout/types";

const REDDIT_HULL_GROUP_LABEL: Record<
  Exclude<HullSlotGroup, "traits">,
  string
> = {
  foreWeapons: "Fore Weapons",
  experimental: "Experimental Weapon",
  deflector: "Deflector",
  impulse: "Impulse Engines",
  core: "Warp Core",
  shields: "Shields",
  aftWeapons: "Aft Weapons",
  devices: "Devices",
  universalConsoles: "Universal Consoles",
  engineeringConsoles: "Engineering Consoles",
  scienceConsoles: "Science Consoles",
  tacticalConsoles: "Tactical Consoles",
  hangars: "Hangar",
};

const REDDIT_TRAIT_SECTIONS: ReadonlyArray<{
  group: CaptainTraitGroup;
  heading: string;
}> = [
  { group: "personalSpace", heading: "Personal Space Traits" },
  { group: "starship", heading: "Starship Traits" },
  { group: "shipSpecific", heading: "Starship Traits (this hull)" },
  { group: "spaceReputation", heading: "Space Reputation Traits" },
  { group: "activeSpaceReputation", heading: "Active Space Reputation Traits" },
];

const REDDIT_RANK_LABEL: Record<BoffOfficerRank, string> = {
  ensign: "Ensign",
  lieutenant: "Lieutenant",
  "lieutenant commander": "Lt. Commander",
  commander: "Commander",
};

const DOFF_ROWS = 6;

export type RedditCaptainInput = {
  name?: string | null;
  career?: string | null;
  faction?: string | null;
  race?: string | null;
  primarySpecialization?: string | null;
  secondarySpecialization?: string | null;
};

export type RedditTemplateInput = {
  title: string;
  shipName: string;
  captain?: RedditCaptainInput | null;
  loadout: CollectionLoadout | null;
  items: ReadonlyArray<LoadoutItem>;
  hullSlots: ReadonlyArray<HullSlot>;
  captainSlots: ReadonlyArray<CaptainTraitSlot>;
  captainFills?: ReadonlyArray<CaptainTraitFill> | null;
  boffStations: ReadonlyArray<BoffStation>;
  setBonuses?: ReadonlyArray<
    Pick<ActiveSetBonus, "name" | "equipped" | "required" | "passives">
  >;
};

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

function lookup(
  byKey: ReadonlyMap<string, LoadoutItem>,
  fill: Pick<LoadoutSlotFill, "catalogKind" | "itemId"> | null,
): LoadoutItem | null {
  if (!fill) return null;
  return byKey.get(loadoutOwnershipKey(fill.catalogKind, fill.itemId)) ?? null;
}

export function escapeRedditCell(value: string): string {
  return value.replace(/\r?\n/g, " ").replace(/\|/g, "/").trim();
}

/** Collapse adjacent identical suffix tokens: [CrtD] [CrtD] [Pen] → [CrtD]x2 [Pen]. */
export function collapseModifierTokens(
  tokens: ReadonlyArray<string>,
): string {
  const parts: string[] = [];
  let index = 0;
  while (index < tokens.length) {
    const token = tokens[index]?.trim();
    if (!token) {
      index += 1;
      continue;
    }
    let count = 1;
    while (tokens[index + count]?.trim() === token) count += 1;
    parts.push(count > 1 ? `${token}x${count}` : token);
    index += count;
  }
  return parts.join(" ");
}

export function formatRedditItemLine(
  item: LoadoutItem | null,
  fill: LoadoutSlotFill | null,
  kind: HullSlot["kind"],
): string {
  if (!item) return "";
  const chunks = [item.name.trim()];
  if (slotUsesItemMods(kind)) {
    chunks.push(`Mk ${displayedMark(fill, kind, item.type)}`);
    if (fill?.modifiers?.length) {
      const mods = collapseModifierTokens(fill.modifiers);
      if (mods) chunks.push(mods);
    }
  }
  return chunks.join(" ");
}

function markdownTable(headers: string[], rows: string[][]): string {
  const formatRow = (cells: string[]) =>
    `|${cells
      .map((cell) => {
        const text = escapeRedditCell(cell);
        return text ? ` ${text} ` : " ";
      })
      .join("|")}|`;
  const head = formatRow(headers);
  const align = formatRow(headers.map(() => ":--"));
  const body = rows
    .map((row) => formatRow(headers.map((_, index) => row[index] ?? "")))
    .join("\n");
  return `${head}\n${align}\n${body}`;
}

function redditRankLabel(rank: string): string {
  const canonical = canonicalOfficerRank(rank);
  if (canonical) return REDDIT_RANK_LABEL[canonical];
  return rank.replace(/\b\w/g, (ch) => ch.toUpperCase());
}

export function redditOfficerTitle(station: BoffStation): string {
  const rank = redditRankLabel(station.seat.rank);
  const career = station.careerChoice ?? station.seat.career;
  const spec = station.seat.specialization?.trim();
  const careerPart = spec ? `${career} / ${spec}` : career;
  return `Officer ${station.index + 1}: ${rank} ( ${careerPart} )`;
}

function playerTable(captain: RedditCaptainInput | null | undefined): string {
  return markdownTable(
    ["Player Info", "Data"],
    [
      ["Captain Name", captain?.name?.trim() ?? ""],
      ["Captain Career", careerLabel(captain?.career)],
      ["Captain Faction", factionLabel(captain?.faction)],
      ["Captain Race", raceLabel(captain?.faction, captain?.race)],
      [
        "Primary Specialization",
        specializationLabel(captain?.primarySpecialization),
      ],
      [
        "Secondary Specialization",
        specializationLabel(captain?.secondarySpecialization),
      ],
      ["Intended Role", ""],
    ],
  );
}

function hullTable(
  loadout: CollectionLoadout | null,
  hullSlots: ReadonlyArray<HullSlot>,
  byKey: ReadonlyMap<string, LoadoutItem>,
): string {
  const rows: string[][] = [];
  for (const section of groupHullSlots(hullSlots)) {
    const redditLabel =
      REDDIT_HULL_GROUP_LABEL[
        section.group as Exclude<HullSlotGroup, "traits">
      ] ?? section.label;
    const header =
      section.slots.length > 1
        ? `**${redditLabel}: ${section.slots.length}**`
        : `**${redditLabel}**`;
    section.slots.forEach((slot, index) => {
      const fill = fillForSlot(loadout, slot.id);
      const item = lookup(byKey, fill);
      rows.push([
        index === 0 ? header : "",
        formatRedditItemLine(item, fill, slot.kind),
        "",
      ]);
    });
  }
  if (rows.length === 0) {
    rows.push(["", "", ""]);
  }
  return markdownTable(["Basic Information", "Component", "Notes"], rows);
}

function boffTable(
  loadout: CollectionLoadout | null,
  stations: ReadonlyArray<BoffStation>,
  byKey: ReadonlyMap<string, LoadoutItem>,
): string {
  const rows: string[][] = [];
  for (const station of stations) {
    station.slots.forEach((slot, index) => {
      const fill = fillForSlot(loadout, slot.id);
      const item = lookup(byKey, fill);
      const power = item
        ? boffPowerDisplayName(asBoffPower(item), slot.rank, fill?.abilityRank)
        : "";
      rows.push([index === 0 ? redditOfficerTitle(station) : "", power, ""]);
    });
  }
  if (rows.length === 0) {
    rows.push(["", "", ""]);
  }
  return markdownTable(["Bridge Officer Information", "Power", "Notes"], rows);
}

function doffTable(): string {
  const rows = Array.from({ length: DOFF_ROWS }, (_, index) => [
    String(index + 1),
    "",
    "",
  ]);
  return markdownTable(["Duty Officer Information", "Power", "Notes"], rows);
}

function traitTable(
  heading: string,
  names: ReadonlyArray<string>,
): string {
  const rows = names.length
    ? names.map((name) => [name, "", ""])
    : [["", "", ""]];
  return markdownTable([heading, "Description", "Notes"], rows);
}

function traitNamesForGroup(
  group: CaptainTraitGroup,
  captainSlots: ReadonlyArray<CaptainTraitSlot>,
  loadout: CollectionLoadout | null,
  captainFills: ReadonlyArray<CaptainTraitFill> | null | undefined,
  byKey: ReadonlyMap<string, LoadoutItem>,
): string[] {
  const names: string[] = [];
  for (const slot of captainSlots.filter((row) => row.group === group)) {
    const fill =
      slot.storage === "loadout"
        ? fillForSlot(loadout, slot.id)
        : fillForCaptainSlot(captainFills, slot.id);
    const item = lookup(byKey, fill);
    if (item?.name.trim()) names.push(item.name.trim());
  }
  return names;
}

function setBonusTable(
  bonuses: RedditTemplateInput["setBonuses"],
): string | null {
  const active = (bonuses ?? []).filter((row) => row.equipped >= 2);
  if (active.length === 0) return null;
  return markdownTable(
    ["Set Name", "Set parts: # of #", "Effects", "Notes"],
    active.map((row) => [
      row.name,
      `${row.equipped}/${row.required}`,
      row.passives?.replace(/\s+/g, " ").trim() ?? "",
      "",
    ]),
  );
}

function powerSettingsTable(): string {
  return markdownTable(
    ["Subsystem Power Settings", "Base", "Modified"],
    [
      ["Weapons", "", ""],
      ["Shields", "", ""],
      ["Engines", "", ""],
      ["Auxiliary", "", ""],
    ],
  );
}

export function exportRedditTemplate(input: RedditTemplateInput): string {
  const byKey = catalogByKey(input.items);
  const title = input.title.trim() || input.shipName.trim() || "Untitled build";
  const sections = [
    `# ${title}`,
    "",
    `**Ship:** ${input.shipName.trim() || title}`,
    "",
    "## Player Information",
    "",
    playerTable(input.captain),
    "",
    "## Ship Information",
    "",
    markdownTable(
      ["Basic Information", "Data"],
      [
        ["Ship Name", title],
        ["Ship Class", input.shipName.trim()],
      ],
    ),
    "",
    "## Ship Loadout",
    "",
    hullTable(input.loadout, input.hullSlots, byKey),
    "",
    "## Officers and Crew",
    "",
    boffTable(input.loadout, input.boffStations, byKey),
    "",
    doffTable(),
    "",
    "## Character, Reputation, and Starship Traits",
    "",
  ];

  for (const section of REDDIT_TRAIT_SECTIONS) {
    const names = traitNamesForGroup(
      section.group,
      input.captainSlots,
      input.loadout,
      input.captainFills,
      byKey,
    );
    sections.push(traitTable(section.heading, names), "");
  }

  sections.push("## Other Information", "", powerSettingsTable(), "");

  const sets = setBonusTable(input.setBonuses);
  if (sets) {
    sections.push(sets, "");
  }

  sections.push(
    "*Skill tree, duty officers, and power settings are not tracked in this builder.*",
    "",
    "*Exported for [r/stobuilds](https://www.reddit.com/r/stobuilds/).*",
  );

  return sections.join("\n").replace(/\n{3,}/g, "\n\n").trim() + "\n";
}
