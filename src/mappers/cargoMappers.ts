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

export function mapTrait(row: RawTrait) {
  return {
    name: row.name,
    type: row.type,
    environment: row.environment ?? "",
    description: row.description,
    shortDescription: row["short description"],
    required: row.required,
    possible: row.possible,
    career: row.career,
    source: row.source,
    charVariant: row["char variant"],
    boffVariant: row["boff variant"],
    doffVariant: row["doff variant"],
    iconName: row["icon name"],
    master: row.master,
    rawData: row,
  };
}

export function mapShip(row: RawShip) {
  return {
    name: row.name,
    description: row.description ?? null,
    tier: parseIntOrNull(row.tier),
    type: row.type,
    hull: row.hull,
    hullMod: parseFloatOrNull(row.hullmod),
    shieldMod: parseFloatOrNull(row.shieldmod),
    turnRate: parseFloatOrNull(row.turnrate),
    impulse: parseFloatOrNull(row.impulse),
    inertia: parseIntOrNull(row.inertia),
    foreWeapons: parseIntOrNull(row.fore),
    aftWeapons: parseIntOrNull(row.aft),
    tacticalSlots: parseIntOrNull(row.consolestac),
    engineeringSlots: parseIntOrNull(row.consoleseng),
    scienceSlots: parseIntOrNull(row.consolessci),
    secondaryDeflector: parseBool(row.secdeflector),
    rawData: row,
  };
}

export function mapStarshipTrait(row: RawStarshipTrait) {
  return {
    name: row.name,
    short: row.short,
    basic: row.basic,
    detailed: row.detailed,
    type: row.type,
    obtained: row.obtained,
    iconName: row["icon name"],
    tag: row.tag,
    tag2: row.tag2,
    tag3: row.tag3,
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
    name: row.name,
    rarity: row.rarity,
    type: row.type,
    boundto: row.boundto,
    boundwhen: row.boundwhen,
    who: row.who,
    head1: row.head1,
    head2: row.head2,
    head3: row.head3,
    head4: row.head4,
    head5: row.head5,
    head6: row.head6,
    head7: row.head7,
    head8: row.head8,
    head9: row.head9,
    subhead1: row.subhead1,
    subhead2: row.subhead2,
    subhead3: row.subhead3,
    subhead4: row.subhead4,
    subhead5: row.subhead5,
    subhead6: row.subhead6,
    subhead7: row.subhead7,
    subhead8: row.subhead8,
    subhead9: row.subhead9,
    text1: row.text1,
    text2: row.text2,
    text3: row.text3,
    text4: row.text4,
    text5: row.text5,
    text6: row.text6,
    text7: row.text7,
    text8: row.text8,
    text9: row.text9,
    equiplimit: parseIntOrNull(row.equiplimit),
    rawData: row,
  };
}

export function mapMastery(row: RawMastery) {
  return {
    masterytype: row.masterytype,
    shiptype: row.shiptype,
    shipfaction: row.shipfaction,
    masterypackage: row.masterypackage,
    trait: row.trait,
    traitdesc: row.traitdesc,
    trait2: row.trait2,
    traitdesc2: row.traitdesc2,
    trait3: row.trait3,
    traitdesc3: row.traitdesc3,
    acctrait: row.acctrait,
    acctraitdesc: row.acctraitdesc,
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
    rawData: row,
  };
}
