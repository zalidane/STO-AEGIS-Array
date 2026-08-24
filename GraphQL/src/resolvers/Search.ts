import type { PrismaClient } from "@sto-aegis/database";
import { formatShipResolvedName } from "../logic/formatShipResolvedName.js";
import { equipmentInfoboxTypeWhere } from "../logic/equipmentInfobox.js";

type ContainsFilter = {
  contains: string;
  mode: "insensitive";
};

function textContains(text: string): ContainsFilter {
  return { contains: text, mode: "insensitive" };
}

/** Build a Prisma `OR` of case-insensitive `contains` filters for string fields. */
export function orTextFields(text: string, fields: readonly string[]) {
  return {
    OR: fields.map((field) => ({ [field]: textContains(text) })),
  };
}

/** Text fields searched for each entity type. */
export const SEARCH_FIELDS = {
  ship: [
    "name",
    "description",
    "type",
    "faction",
    "factionLede",
    "internalName",
    "displayPrefix",
    "displayClass",
    "displayType",
    "uniconsole",
    "abilities",
    "boffs",
    "cost",
  ],
  starshipTrait: [
    "name",
    "short",
    "basic",
    "detailed",
    "type",
    "obtained",
    "tag",
    "tag2",
    "tag3",
  ],
  trait: [
    "name",
    "description",
    "shortDescription",
    "type",
    "environment",
    "required",
    "possible",
    "career",
    "source",
    "charVariant",
    "boffVariant",
    "doffVariant",
    "master",
  ],
  traySkill: [
    "name",
    "system",
    "description",
    "descriptionLong",
    "targets",
    "affects",
    "type",
    "region",
    "rank1info",
    "rank2info",
    "rank3info",
    "rank4info",
    "rank5info",
  ],
  reputation: ["name", "description", "link", "environment"],
  setBonus: ["name", "setPage", "passives", "traySkills", "procs", "abilities"],
  infobox: [
    "name",
    "type",
    "rarity",
    "who",
    "boundto",
    "text1",
    "text2",
    "text3",
    "text4",
    "text5",
    "text6",
    "text7",
    "text8",
    "text9",
    "head1",
    "head2",
    "head3",
    "head4",
    "head5",
    "head6",
    "head7",
    "head8",
    "head9",
  ],
} as const;

const SEARCH_TAKE = 20;

export function createSearchResolver(prisma: PrismaClient) {
  return {
    Query: {
      search: async (_parent: unknown, args: { text: string }) => {
        const text = args.text.trim();
        if (!text) return [];

        const [
          ships,
          starshipTraits,
          traits,
          traySkills,
          reputations,
          setBonuses,
          infoboxes,
        ] = await Promise.all([
          prisma.ship.findMany({
            where: orTextFields(text, SEARCH_FIELDS.ship),
            take: SEARCH_TAKE,
            orderBy: { name: "asc" },
          }),
          prisma.starshipTrait.findMany({
            where: orTextFields(text, SEARCH_FIELDS.starshipTrait),
            take: SEARCH_TAKE,
            orderBy: { name: "asc" },
          }),
          prisma.trait.findMany({
            where: orTextFields(text, SEARCH_FIELDS.trait),
            take: SEARCH_TAKE,
            orderBy: { name: "asc" },
          }),
          prisma.traySkill.findMany({
            where: orTextFields(text, SEARCH_FIELDS.traySkill),
            take: SEARCH_TAKE,
            orderBy: { name: "asc" },
          }),
          prisma.reputation.findMany({
            where: orTextFields(text, SEARCH_FIELDS.reputation),
            take: SEARCH_TAKE,
            orderBy: { name: "asc" },
          }),
          prisma.setBonus.findMany({
            where: orTextFields(text, SEARCH_FIELDS.setBonus),
            take: SEARCH_TAKE,
            orderBy: { name: "asc" },
          }),
          prisma.infobox.findMany({
            where: {
              AND: [
                orTextFields(text, SEARCH_FIELDS.infobox),
                equipmentInfoboxTypeWhere(),
              ],
            },
            take: SEARCH_TAKE,
            orderBy: { name: "asc" },
          }),
        ]);

        return [
          ...ships.map((s) => ({
            type: "Ship",
            name: formatShipResolvedName(s.name, s.displayClass),
            id: s.id,
          })),
          ...starshipTraits.map((t) => ({
            type: "StarshipTrait",
            name: t.name,
            id: t.id,
          })),
          ...traits.map((t) => ({ type: "Trait", name: t.name, id: t.Id })),
          ...traySkills.map((t) => ({
            type: "TraySkill",
            name: t.name,
            id: t.id,
          })),
          ...reputations.map((r) => ({
            type: "Reputation",
            name: r.name,
            id: r.id,
          })),
          ...setBonuses.map((s) => ({
            type: "SetBonus",
            name: s.name,
            id: s.id,
          })),
          ...infoboxes.map((item) => ({
            type: "Infobox",
            name: item.name,
            id: item.id,
          })),
        ];
      },
    },
  };
}
