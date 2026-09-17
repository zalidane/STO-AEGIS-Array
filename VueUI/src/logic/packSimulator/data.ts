import type { PackOffer, RewardDefinition, TierDefinition } from "./types";

/** Official source: https://www.playstartrekonline.com/en/news/article/11583056 */
export const ARTICLE_URL =
  "https://www.playstartrekonline.com/en/news/article/11583056";

export const ARTICLE_TITLE = "A New Way to Obtain Ships!";

export const PACK_NAME = "60th Anniversary Starship Icons Prize Pack";

export const TIERS: readonly TierDefinition[] = [
  {
    id: "fleetAdmiral",
    label: "Fleet Admiral",
    storeCost: 2000,
    schematicChoice: 500,
  },
  {
    id: "admiral",
    label: "Admiral",
    storeCost: 500,
    schematicChoice: 200,
  },
  {
    id: "captain",
    label: "Captain",
    storeCost: 200,
    schematicChoice: 100,
  },
  {
    id: "commander",
    label: "Commander",
    storeCost: 100,
    schematicChoice: 50,
  },
  {
    id: "lieutenant",
    label: "Lieutenant",
    storeCost: 50,
    schematicChoice: 20,
  },
  {
    id: "ensign",
    label: "Ensign",
    storeCost: 20,
    schematicChoice: 5,
  },
] as const;

export const PACK_OFFERS: readonly PackOffer[] = [
  {
    id: "single",
    label: "Single pack",
    zenCost: 450,
    packCount: 1,
    bonusSchematics: 0,
    oncePerAccount: false,
  },
  {
    id: "twelve",
    label: "12-pack",
    zenCost: 4500,
    packCount: 12,
    bonusSchematics: 0,
    oncePerAccount: false,
  },
  {
    id: "sixty",
    label: "60-pack + 60 Schematics",
    zenCost: 22500,
    packCount: 60,
    bonusSchematics: 60,
    oncePerAccount: true,
  },
] as const;

const ship = (
  id: string,
  name: string,
  tierId: RewardDefinition["tierId"],
): RewardDefinition => ({ id, name, tierId, kind: "ship" });

const item = (
  id: string,
  name: string,
  tierId: RewardDefinition["tierId"],
): RewardDefinition => ({ id, name, tierId, kind: "item" });

export const REWARDS: readonly RewardDefinition[] = [
  ship(
    "constitution-pilot-mmc",
    "Constitution Pilot Multi-Mission Cruiser",
    "fleetAdmiral",
  ),

  ship("orion-orchid", "Orion Orchid Intel Warship [T6]", "admiral"),
  ship("breen-yod-thot", "Breen Yod-Thot Dreadnought Carrier [T6]", "admiral"),
  ship(
    "constitution-iii-mw",
    "Constitution III Miracle Worker Cruiser [T6]",
    "admiral",
  ),
  ship("shrike-intel", "Shrike Intel Juggernaut [T6]", "admiral"),
  ship(
    "kelvin-constitution-ii",
    "Kelvin Timeline Constitution II Intel Cruiser [T6]",
    "admiral",
  ),
  ship(
    "protostar-spearhead",
    "Protostar Temporal Science Spearhead (T6)",
    "admiral",
  ),
  ship("trafalgar-juggernaut", "Trafalgar Command Juggernaut (T6)", "admiral"),
  ship("23rd-century-t6", "23rd Century Tier 6 Ship", "admiral"),
  ship(
    "26th-century-hdn",
    "26th Century Heavy Dreadnought Tier 6 Ship",
    "admiral",
  ),
  ship(
    "discovery-fdc",
    "Discovery Flight Deck Carrier Tier 6 Ship",
    "admiral",
  ),
  ship(
    "california-mw",
    "California Miracle Worker Utility Cruiser (T6)",
    "admiral",
  ),
  ship(
    "crossfield-refit",
    "Crossfield Science Spearhead Refit (T6)",
    "admiral",
  ),
  ship(
    "kelvin-divergence-choice",
    "Special Requisition Choice Pack - Kelvin Divergence Lockbox Ship Pack",
    "admiral",
  ),
  ship(
    "liberated-borg-juggernaut",
    "Liberated Borg Command Juggernaut (T6)",
    "admiral",
  ),
  ship("discovery-starship", "Discovery Starship (T6)", "admiral"),

  ship(
    "section-31-dreadnought",
    "Section 31 Intel Dreadnought Cruiser [T6]",
    "captain",
  ),
  ship("pakled-clumpship", "Pakled Miracle Worker Clumpship [T6]", "captain"),
  ship(
    "tzenkethi-tzen-tar",
    "Tzenkethi Tzen-tar Dreadnought Carrier [T6]",
    "captain",
  ),
  ship(
    "world-razer",
    "World Razer Temporal Ops Juggernaut (T6)",
    "captain",
  ),
  ship("farragut-temporal", "Farragut Temporal Cruiser (T6)", "captain"),
  ship(
    "kirk-heavy-battlecruiser",
    "Kirk Temporal Heavy Battlecruiser [T6]",
    "captain",
  ),
  ship("sagan-command", "Sagan Command Cruiser [T6]", "captain"),
  ship("la-sirena", "La Sirena Heavy Raider [T6]", "captain"),
  ship(
    "freedom-exploration",
    "Freedom-class Exploration Frigate [T6]",
    "captain",
  ),
  ship(
    "vaadwaur-juggernaut",
    "Vaadwaur Miracle Worker Juggernaut [T6]",
    "captain",
  ),
  ship(
    "excelsior-ii",
    "Excelsior II Intel Heavy Cruiser (T6)",
    "captain",
  ),
  ship("baul-sentry", "Ba'ul Sentry Vessel (T6)", "captain"),
  ship(
    "parliament-surveyor",
    "Parliament Miracle Worker Surveyor Cruiser (T6)",
    "captain",
  ),
  ship("temporal-science-vessel", "Temporal Science Vessel (T6)", "captain"),
  ship("tos-dreadnought", "TOS Dreadnought Starship (T6)", "captain"),

  ship("eleos-intel", "Eleos Intel Scout Vessel", "commander"),
  ship("federation-intel-holoship", "Federation Intel Holoship", "commander"),
  ship(
    "garrett-alliance-dreadnought",
    "Garrett Command Alliance Dreadnought Cruiser",
    "commander",
  ),
  ship("typhoon-temporal", "Typhoon Temporal Battlecruiser", "commander"),
  ship(
    "khitomer-alliance",
    "Khitomer Alliance Battlecruiser",
    "commander",
  ),
  ship("mirror-gagarin", "Mirror Gagarin Warship", "commander"),
  ship(
    "herald-vonph",
    "Herald Vonph Dreadnought Carrier (T6)",
    "commander",
  ),
  ship(
    "miradorn-theta",
    "Miradorn Theta Class Heavy Raider (T6)",
    "commander",
  ),
  ship("maquis-raider", "Maquis Raider [T6]", "commander"),
  ship("husnock-warship", "Husnock Warship [T6]", "commander"),
  ship("nx-escort-refit", "NX Escort Refit [T6]", "commander"),
  ship(
    "kelvin-intel-dreadnought",
    "Kelvin Timeline Intel Dreadnought Cruiser [T6]",
    "commander",
  ),
  ship(
    "walker-exploration",
    "Walker-class Light Exploration Cruiser [T6]",
    "commander",
  ),
  ship("bajoran-denorios", "Bajoran Denorios Interceptor", "commander"),
  ship("kobali-samsar", "Kobali Samsar Cruiser", "commander"),

  ship("fleet-exploration-cruiser", "Fleet Exploration Cruiser (T6)", "lieutenant"),
  ship(
    "fleet-long-range-science",
    "Fleet Long Range Science Vessel (T6)",
    "lieutenant",
  ),
  ship("fleet-arbiter", "Fleet Arbiter Battlecruiser (T6)", "lieutenant"),
  ship(
    "fleet-heavy-strike-wing",
    "Fleet Heavy Strike Wing Escort (T6)",
    "lieutenant",
  ),
  ship("fleet-dreadnought-cruiser", "Fleet Dreadnought Cruiser (T6)", "lieutenant"),
  ship("fleet-tactical-escort", "Fleet Tactical Escort (T6)", "lieutenant"),
  ship(
    "fleet-soyuz",
    "Fleet Soyuz Intel Heavy Frigate (T6)",
    "lieutenant",
  ),
  ship(
    "fleet-neghtev",
    "Fleet Negh'Tev Heavy Battlecruiser (T6)",
    "lieutenant",
  ),
  ship("fleet-brel", "Fleet B'rel Bird-of-Prey (T6)", "lieutenant"),
  ship(
    "fleet-vorral",
    "Fleet Vor'ral Support Battlecruiser (T6)",
    "lieutenant",
  ),

  item("experimental-ship-upgrade", "Experimental Ship Upgrade Token", "ensign"),
  item("fleet-ship-module", "Fleet Ship Module", "ensign"),
  item(
    "ultimate-tech-upgrade",
    "Ultimate Tech Upgrade (Non-tradeable)",
    "ensign",
  ),
  item("captain-alteration", "Captain Alteration Token", "ensign"),
  item("elite-captain-training", "Elite Captain Training Token", "ensign"),
  item(
    "elite-bridge-officer-training",
    "Elite Bridge Officer Training Token",
    "ensign",
  ),
] as const;

export const REWARD_BY_ID: ReadonlyMap<string, RewardDefinition> = new Map(
  REWARDS.map((reward) => [reward.id, reward]),
);

export const TIER_BY_ID: ReadonlyMap<string, TierDefinition> = new Map(
  TIERS.map((tier) => [tier.id, tier]),
);

export const PACK_OFFER_BY_ID: ReadonlyMap<string, PackOffer> = new Map(
  PACK_OFFERS.map((offer) => [offer.id, offer]),
);

export function rewardsForTier(tierId: TierDefinition["id"]): RewardDefinition[] {
  return REWARDS.filter((reward) => reward.tierId === tierId);
}

export function shipRewards(): RewardDefinition[] {
  return REWARDS.filter((reward) => reward.kind === "ship");
}
