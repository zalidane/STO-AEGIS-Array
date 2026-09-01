import type {
  RawGwObtain,
  RawInfobox,
  RawMastery,
  RawModifier,
  RawReputation,
  RawSetBonus,
  RawShip,
  RawStarshipTrait,
  RawSwObtain,
  RawTrait,
  RawTraySkill,
} from "../types/CargoTypes";
import {
  decodeHtmlEntities,
  decodeHtmlEntitiesOrNull,
} from "../utils/decodeHtmlEntities";

function parseIntOrNull(value: string | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

function parseFloatOrNull(value: string | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number.parseFloat(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function parseBool(
  value: string | null | undefined,
  fallback = false,
): boolean {
  if (value === null || value === undefined || value === "") return fallback;
  const normalized = value.toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes";
}

function parseBoolOrNull(value: string | null | undefined): boolean | null {
  if (value === null || value === undefined || value === "") return null;
  return parseBool(value);
}

function decodeString(value: string): string {
  return decodeHtmlEntities(value);
}

export function mapTrait(row: RawTrait) {
  return {
    name: decodeString(row.name),
    type: decodeString(row.type),
    environment: row.environment ? decodeString(row.environment) : "",
    description: decodeHtmlEntitiesOrNull(row.description),
    shortDescription: decodeHtmlEntitiesOrNull(row["short description"]),
    required: decodeHtmlEntitiesOrNull(row.required),
    possible: decodeHtmlEntitiesOrNull(row.possible),
    career: decodeHtmlEntitiesOrNull(row.career),
    source: decodeHtmlEntitiesOrNull(row.source),
    charVariant: decodeHtmlEntitiesOrNull(row["char variant"]),
    boffVariant: decodeHtmlEntitiesOrNull(row["boff variant"]),
    doffVariant: decodeHtmlEntitiesOrNull(row["doff variant"]),
    iconName: decodeHtmlEntitiesOrNull(row["icon name"]),
    master: decodeHtmlEntitiesOrNull(row.master),
    rawData: row,
  };
}

export function mapShip(row: RawShip) {
  return {
    name: decodeString(row.name),
    description: decodeHtmlEntitiesOrNull(row.description ?? null),
    image: decodeHtmlEntitiesOrNull(row.image),
    image2: decodeHtmlEntitiesOrNull(row.image2),
    released: decodeHtmlEntitiesOrNull(row.released),
    internalName: decodeHtmlEntitiesOrNull(row.internalname),
    fc: parseBool(row.fc),
    faction: decodeHtmlEntitiesOrNull(row.faction),
    facSort: decodeHtmlEntitiesOrNull(row.facsort),
    rank: decodeHtmlEntitiesOrNull(row.rank),
    rankLevel: parseIntOrNull(row.ranklevel),
    tier: parseIntOrNull(row.tier),
    upgradeCost: decodeHtmlEntitiesOrNull(row.upgradecost),
    type: decodeHtmlEntitiesOrNull(row.type),
    hull: decodeHtmlEntitiesOrNull(row.hull),
    hullMod: parseFloatOrNull(row.hullmod),
    shieldMod: parseFloatOrNull(row.shieldmod),
    turnRate: parseFloatOrNull(row.turnrate),
    impulse: parseFloatOrNull(row.impulse),
    inertia: parseIntOrNull(row.inertia),
    powerAll: parseIntOrNull(row.powerall),
    powerWeapons: parseIntOrNull(row.powerweapons),
    powerShields: parseIntOrNull(row.powershields),
    powerEngines: parseIntOrNull(row.powerengines),
    powerAuxiliary: parseIntOrNull(row.powerauxiliary),
    powerBoost: parseIntOrNull(row.powerboost),
    boffs: decodeHtmlEntitiesOrNull(row.boffs),
    foreWeapons: parseIntOrNull(row.fore),
    aftWeapons: parseIntOrNull(row.aft),
    equipCannons: parseBoolOrNull(row.equipcannons),
    devices: parseIntOrNull(row.devices),
    tacticalSlots: parseIntOrNull(row.consolestac),
    engineeringSlots: parseIntOrNull(row.consoleseng),
    scienceSlots: parseIntOrNull(row.consolessci),
    uniconsole: decodeHtmlEntitiesOrNull(row.uniconsole),
    t5uConsole: decodeHtmlEntitiesOrNull(row.t5uconsole),
    experimental: parseBool(row.experimental),
    secondaryDeflector: parseBool(row.secdeflector),
    hangars: parseIntOrNull(row.hangars),
    cost: decodeHtmlEntitiesOrNull(row.cost),
    abilities: decodeHtmlEntitiesOrNull(row.abilities),
    admiraltyEng: parseIntOrNull(row.admiraltyeng),
    admiraltyTac: parseIntOrNull(row.admiraltytac),
    admiraltySci: parseIntOrNull(row.admiraltysci),
    displayPrefix: decodeHtmlEntitiesOrNull(row.displayprefix),
    displayClass: decodeHtmlEntitiesOrNull(row.displayclass),
    displayType: decodeHtmlEntitiesOrNull(row.displaytype),
    factionLede: decodeHtmlEntitiesOrNull(row.factionlede),
    rawData: row,
  };
}

export function mapStarshipTrait(row: RawStarshipTrait) {
  return {
    name: decodeString(row.name),
    short: decodeHtmlEntitiesOrNull(row.short),
    basic: decodeHtmlEntitiesOrNull(row.basic),
    detailed: decodeHtmlEntitiesOrNull(row.detailed),
    type: decodeHtmlEntitiesOrNull(row.type),
    obtained: decodeHtmlEntitiesOrNull(row.obtained) ?? row.obtained,
    iconName: decodeHtmlEntitiesOrNull(row["icon name"]),
    tag: decodeHtmlEntitiesOrNull(row.tag),
    tag2: decodeHtmlEntitiesOrNull(row.tag2),
    tag3: decodeHtmlEntitiesOrNull(row.tag3),
    rawData: row,
  };
}

export function mapGwObtain(row: RawGwObtain) {
  return {
    cat: row.cat,
    type: row.type,
    flavor: row.flavor,
    box: row.box,
    lb: row.lb,
    rep: row.rep,
    rawData: row,
  };
}

export function mapSwObtain(row: RawSwObtain) {
  return {
    cat: row.cat,
    type: row.type,
    flavor: row.flavor,
    box: row.box,
    lb: row.lb,
    ships: row.ships,
    rep: row.rep,
    rawData: row,
  };
}

export function mapInfobox(row: RawInfobox) {
  return {
    name: decodeString(row.name),
    rarity: decodeHtmlEntitiesOrNull(row.rarity),
    type: decodeHtmlEntitiesOrNull(row.type),
    boundto: decodeHtmlEntitiesOrNull(row.boundto),
    boundwhen: decodeHtmlEntitiesOrNull(row.boundwhen),
    who: decodeHtmlEntitiesOrNull(row.who),
    head1: decodeHtmlEntitiesOrNull(row.head1),
    head2: decodeHtmlEntitiesOrNull(row.head2),
    head3: decodeHtmlEntitiesOrNull(row.head3),
    head4: decodeHtmlEntitiesOrNull(row.head4),
    head5: decodeHtmlEntitiesOrNull(row.head5),
    head6: decodeHtmlEntitiesOrNull(row.head6),
    head7: decodeHtmlEntitiesOrNull(row.head7),
    head8: decodeHtmlEntitiesOrNull(row.head8),
    head9: decodeHtmlEntitiesOrNull(row.head9),
    subhead1: decodeHtmlEntitiesOrNull(row.subhead1),
    subhead2: decodeHtmlEntitiesOrNull(row.subhead2),
    subhead3: decodeHtmlEntitiesOrNull(row.subhead3),
    subhead4: decodeHtmlEntitiesOrNull(row.subhead4),
    subhead5: decodeHtmlEntitiesOrNull(row.subhead5),
    subhead6: decodeHtmlEntitiesOrNull(row.subhead6),
    subhead7: decodeHtmlEntitiesOrNull(row.subhead7),
    subhead8: decodeHtmlEntitiesOrNull(row.subhead8),
    subhead9: decodeHtmlEntitiesOrNull(row.subhead9),
    text1: decodeHtmlEntitiesOrNull(row.text1),
    text2: decodeHtmlEntitiesOrNull(row.text2),
    text3: decodeHtmlEntitiesOrNull(row.text3),
    text4: decodeHtmlEntitiesOrNull(row.text4),
    text5: decodeHtmlEntitiesOrNull(row.text5),
    text6: decodeHtmlEntitiesOrNull(row.text6),
    text7: decodeHtmlEntitiesOrNull(row.text7),
    text8: decodeHtmlEntitiesOrNull(row.text8),
    text9: decodeHtmlEntitiesOrNull(row.text9),
    equiplimit: parseIntOrNull(row.equiplimit),
    image: decodeHtmlEntitiesOrNull(row.image ?? null),
    rawData: row,
  };
}

export function mapMastery(row: RawMastery) {
  return {
    masterytype: decodeString(row.masterytype),
    shiptype: decodeString(row.shiptype),
    shipfaction: decodeString(row.shipfaction),
    masterypackage: decodeString(row.masterypackage),
    trait: decodeHtmlEntitiesOrNull(row.trait),
    traitdesc: decodeHtmlEntitiesOrNull(row.traitdesc),
    trait2: decodeHtmlEntitiesOrNull(row.trait2),
    traitdesc2: decodeHtmlEntitiesOrNull(row.traitdesc2),
    trait3: decodeHtmlEntitiesOrNull(row.trait3),
    traitdesc3: decodeHtmlEntitiesOrNull(row.traitdesc3),
    acctrait: decodeHtmlEntitiesOrNull(row.acctrait),
    acctraitdesc: decodeHtmlEntitiesOrNull(row.acctraitdesc),
    rawData: row,
  };
}

export function mapModifier(row: RawModifier) {
  return {
    modifier: row.modifier,
    stats: row.stats,
    type: row.type,
    available: row.available,
    isunique: parseBool(row.isunique),
    isepic: parseBool(row.isepic),
    info: row.info,
    rawData: row,
  };
}

export function mapReputation(row: RawReputation) {
  return {
    name: row.name,
    color1: row.color1,
    color2: row.color2,
    icon: row.icon,
    link: row.link,
    description: row.description,
    released: row.released,
    environment: row.environment,
    boff: parseBoolOrNull(row.boff),
    secondary: parseBoolOrNull(row.secondary),
    rawData: row,
  };
}

export function mapSetBonus(row: RawSetBonus) {
  return {
    name: row.Name,
    setPage: row.SetPage,
    reqItems: parseIntOrNull(row.ReqItems),
    passives: row.Passives,
    traySkills: row.TraySkills,
    procs: row.Procs,
    abilities: row.Abilities,
    rawData: row,
  };
}

export function mapTraySkill(row: RawTraySkill) {
  return {
    name: row.name,
    system: row.system,
    description: row.description,
    descriptionLong: row["description long"],
    targets: row.targets,
    affects: row.affects,
    activation: row.activation,
    rechargeBase: parseIntOrNull(row["recharge base"]),
    rechargeGlobal: parseIntOrNull(row["recharge global"]),
    type: row.type,
    region: row.region,
    rank1rank: row.rank1rank,
    rank2rank: row.rank2rank,
    rank3rank: row.rank3rank,
    rank4rank: row.rank4rank,
    rank5rank: row.rank5rank,
    rank1info: row.rank1info,
    rank2info: row.rank2info,
    rank3info: row.rank3info,
    rank4info: row.rank4info,
    rank5info: row.rank5info,
    image: row.image ?? null,
    rawData: row,
  };
}
