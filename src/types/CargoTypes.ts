export interface RawTrait {
  name: string;
  type?: string | null;
  environment?: string | null;

  description?: string | null;

  "short description"?: string | null;

  required?: string | null;
  possible?: string | null;
  career?: string | null;
  source?: string | null;

  "char variant"?: string | null;
  "boff variant"?: string | null;
  "doff variant"?: string | null;

  "icon name"?: string | null;

  master?: string | null;
}

export interface RawShip {
  name: string;
  description?: string;
  tier?: string;
  image: string | null;
  image2: string | null;
  released: string | null;
  internalname: string | null;
  fc: string | null;
  faction: string | null;
  facsort: string | null;
  rank: string | null;
  ranklevel: string | null;
  upgradecost: string | null;
  type: string | null;
  hull: string | null;
  hullmod: string | null;
  shieldmod: string | null;
  turnrate: string | null;
  impulse: string | null;
  inertia: string | null;
  powerall: string | null;
  powerweapons: string | null;
  powershields: string | null;
  powerengines: string | null;
  powerauxiliary: string | null;
  powerboost: string | null;
  boffs: string | null;
  fore: string | null;
  aft: string | null;
  equipcannons: string | null;
  devices: string | null;
  consolestac: string | null;
  consoleseng: string | null;
  consolessci: string | null;
  uniconsole: string | null;
  t5uconsole: string | null;
  experimental: string | null;
  secdeflector: string | null;
  hangars: string | null;
  cost: string | null;
  abilities: string | null;
  admiraltyeng: string | null;
  admiraltytac: string | null;
  admiraltysci: string | null;
  displayprefix: string | null;
  displayclass: string | null;
  displaytype: string | null;
  factionlede: string | null;
}

export interface RawStartshipTrait {
  name: string;
  short: string | null;
  basic: string | null;
  detailed: string | null;
  type: string | null;
  obtained: string | null;
  "icon name": string | null;
  tag: string | null;
  tag2: string | null;
  tag3: string | null;
}
