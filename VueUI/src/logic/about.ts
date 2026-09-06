import { DISCLAIMER } from "@/logic/attribution";

export const KOFI_URL = "https://ko-fi.com/zalidane";
export const KOFI_LABEL = "ko-fi.com/zalidane";
export const GITHUB_URL = "https://github.com/zalidane/STO-AEGIS-Array";

export type AboutLink = {
  label: string;
  href: string;
};

export type AboutSection = {
  id: string;
  title: string;
  paragraphs: string[];
  links: AboutLink[];
};

export function aboutPageTitle(): string {
  return "About";
}

export const ABOUT_LEDE =
  "An unofficial Star Trek Online catalog, collection tracker, and loadout builder. Seat gear on hull-legal slots, share a build, or export it for r/stobuilds.";

export const ABOUT_SECTIONS: AboutSection[] = [
  {
    id: "what",
    title: "What this is",
    paragraphs: [
      "STO-AEGIS Array is a fan-made tool for browsing STOWiki catalog data and keeping a captain folder on this device: ships, items, traits, bridge-officer powers, and hull loadouts.",
      "The builder checks slot legality, career, rank, and specialization. It does not predict DPS or simulate combat — it is inventory on a ship, not a combat sim.",
      DISCLAIMER,
    ],
    links: [{ label: "STOWiki", href: "https://stowiki.net/" }],
  },
  {
    id: "data",
    title: "Your collection stays in this browser",
    paragraphs: [
      "Captains, collected items, and loadouts are stored locally in this browser. They are not uploaded to a user account on the host.",
      "Clearing this site’s data, switching browsers, or using a private window starts you with an empty armory. Shared build links store a snapshot of a loadout on the server so others can open them.",
    ],
    links: [],
  },
  {
    id: "support",
    title: "Optional hosting support",
    paragraphs: [
      "The catalog API and this site cost money to keep online. Donations are optional and do not unlock features — they only help cover hosting.",
      "If you want to chip in, Ko-fi is the donation page.",
    ],
    links: [],
  },
  {
    id: "credits",
    title: "Credits and licenses",
    paragraphs: [
      "Game text and cargo data come from STOWiki contributors (CC BY-NC-SA 3.0 where the wiki can license that material). Icons and ship renders are Cryptic / DECA / Paramount artwork via STOWiki and are not MIT project code.",
      "Source for this project is on GitHub. License details for wiki text and images are on the Attributions page.",
    ],
    links: [
      { label: "Attributions", href: "/attributions" },
      { label: "GitHub", href: GITHUB_URL },
    ],
  },
];

export function isInternalHref(href: string): boolean {
  return href.startsWith("/");
}
