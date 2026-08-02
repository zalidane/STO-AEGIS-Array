/** Raw cargo row shapes — all values from the wiki API are `string | null`. */

export interface RawTrait {
  name: string;
  type: string;
  environment: string | null;
  description: string | null;
  "short description": string | null;
  required: string | null;
  possible: string | null;
  career: string | null;
  source: string | null;
  "char variant": string | null;
  "boff variant": string | null;
  "doff variant": string | null;
  "icon name": string | null;
  master: string;
}

export interface RawShip {
  name: string;
  /** Not present in current Ships.json extracts; kept optional for mapper compat. */
  description?: string | null;
  image: string;
  image2: string | null;
  released: string;
  internalname: string | null;
  fc: string;
  faction: string;
  facsort: string;
  rank: string;
  ranklevel: string;
  tier: string;
  upgradecost: string | null;
  type: string;
  hull: string;
  hullmod: string;
  shieldmod: string;
  turnrate: string;
  impulse: string | null;
  inertia: string | null;
  powerall: string | null;
  powerweapons: string | null;
  powershields: string | null;
  powerengines: string | null;
  powerauxiliary: string | null;
  powerboost: string | null;
  boffs: string | null;
  fore: string;
  aft: string;
  equipcannons: string;
  devices: string;
  consolestac: string;
  consoleseng: string;
  consolessci: string;
  uniconsole: string | null;
  t5uconsole: string | null;
  experimental: string;
  secdeflector: string;
  hangars: string | null;
  cost: string | null;
  abilities: string | null;
  admiraltyeng: string | null;
  admiraltytac: string | null;
  admiraltysci: string | null;
  displayprefix: string | null;
  displayclass: string | null;
  displaytype: string | null;
  factionlede: string;
}

export interface RawStarshipTrait {
  name: string;
  short: string | null;
  basic: string | null;
  detailed: string;
  type: string;
  obtained: string;
  "icon name": string | null;
  tag: string | null;
  tag2: string | null;
  tag3: string | null;
}

export interface RawGwObtain {
  cat: string;
  type: string;
  flavor: string;
  box: string;
  lb: string | null;
  rep: string | null;
}

export interface RawSwObtain {
  cat: string;
  type: string;
  flavor: string;
  box: string | null;
  lb: string | null;
  ships: string | null;
  rep: string | null;
}

export interface RawInfobox {
  name: string;
  rarity: string | null;
  type: string | null;
  boundto: string | null;
  boundwhen: string | null;
  who: string | null;
  head1: string | null;
  head2: string | null;
  head3: string | null;
  head4: string | null;
  head5: string | null;
  head6: string | null;
  head7: string | null;
  head8: string | null;
  head9: string | null;
  subhead1: string | null;
  subhead2: string | null;
  subhead3: string | null;
  subhead4: string | null;
  subhead5: string | null;
  subhead6: string | null;
  subhead7: string | null;
  subhead8: string | null;
  subhead9: string | null;
  text1: string | null;
  text2: string | null;
  text3: string | null;
  text4: string | null;
  text5: string | null;
  text6: string | null;
  text7: string | null;
  text8: string | null;
  text9: string | null;
  equiplimit: string | null;
}

export interface RawMastery {
  masterytype: string;
  shiptype: string;
  shipfaction: string;
  masterypackage: string;
  trait: string | null;
  traitdesc: string | null;
  trait2: string | null;
  traitdesc2: string | null;
  trait3: string | null;
  traitdesc3: string | null;
  acctrait: string | null;
  acctraitdesc: string | null;
}

export interface RawModifier {
  modifier: string;
  stats: string | null;
  type: string;
  available: string | null;
  isunique: string;
  isepic: string;
  info: string | null;
}

export interface RawReputation {
  color1: string;
  color2: string;
  icon: string;
  link: string;
  name: string;
  description: string;
  released: string;
  environment: string | null;
  boff: string | null;
  secondary: string | null;
}

export interface RawSetBonus {
  Name: string;
  SetPage: string;
  ReqItems: string;
  Passives: string;
  TraySkills: string | null;
  Procs: string;
  Abilities: string | null;
}

export interface RawTraySkill {
  name: string;
  system: string | null;
  description: string;
  "description long": string;
  targets: string;
  affects: string | null;
  activation: string | null;
  "recharge base": string | null;
  "recharge global": string | null;
  type: string;
  region: string;
  rank1rank: string;
  rank2rank: string;
  rank3rank: string | null;
  rank4rank: string | null;
  rank5rank: string | null;
  rank1info: string;
  rank2info: string;
  rank3info: string | null;
  rank4info: string | null;
  rank5info: string | null;
}
