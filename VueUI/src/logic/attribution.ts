/** Structured third-party attribution for wiki text and images. */

export const STOWIKI_HOME_URL = "https://stowiki.net/";
export const STOWIKI_COPYRIGHTS_URL =
  "https://stowiki.net/wiki/STOWiki:Copyrights";
export const STOWIKI_OFFICIAL_IMAGES_URL =
  "https://stowiki.net/wiki/Category:Official_images";
export const CC_BY_NC_SA_30_URL =
  "https://creativecommons.org/licenses/by-nc-sa/3.0/";

export type AttributionLink = {
  label: string;
  href: string;
};

export type AttributionSection = {
  id: string;
  title: string;
  paragraphs: string[];
  links: AttributionLink[];
};

export const FOOTER_SUMMARY =
  "Game data and text from STOWiki (CC BY-NC-SA 3.0). Images © Cryptic / DECA / Paramount via STOWiki.";

export const DISCLAIMER =
  "STO-AEGIS Array is an unofficial fan project and is not affiliated with, endorsed by, or sponsored by Paramount, Cryptic Studios, DECA Games, or related rights holders.";

export const ATTRIBUTION_SECTIONS: AttributionSection[] = [
  {
    id: "ip",
    title: "Intellectual property",
    paragraphs: [
      "Star Trek and related marks are the intellectual property of Paramount, Gene Roddenberry, Cryptic Studios, DECA Games, Atari, and Arc Games (and their respective licensors).",
      DISCLAIMER,
    ],
    links: [{ label: "STOWiki home", href: STOWIKI_HOME_URL }],
  },
  {
    id: "text",
    title: "Wiki text and Cargo data",
    paragraphs: [
      "Names, descriptions, obtained notes, and other textual fields shown in this app are derived from Star Trek Online Wiki (STOWiki) contributors.",
      "Where STOWiki may lawfully license that material, it is available under Creative Commons Attribution-NonCommercial-ShareAlike 3.0 Unported (CC BY-NC-SA 3.0). Attribution, NonCommercial, and ShareAlike obligations apply to reuse of that text.",
    ],
    links: [
      { label: "STOWiki:Copyrights", href: STOWIKI_COPYRIGHTS_URL },
      { label: "CC BY-NC-SA 3.0", href: CC_BY_NC_SA_30_URL },
    ],
  },
  {
    id: "images",
    title: "Images",
    paragraphs: [
      "Icons and ship renders are downloaded from STOWiki, primarily from Category:Official images (files tagged as STO official images).",
      "Those assets are Star Trek Online game artwork and icons created or released by Cryptic Studios / DECA Games and related rights holders. They are not licensed as MIT project code and are generally not covered by the wiki’s CC BY-NC-SA grant for community-authored text.",
    ],
    links: [
      { label: "Category:Official images", href: STOWIKI_OFFICIAL_IMAGES_URL },
      { label: "STOWiki home", href: STOWIKI_HOME_URL },
    ],
  },
];

export function attributionPageTitle(): string {
  return "Attributions";
}

export function footerAttributionLine(): string {
  return FOOTER_SUMMARY;
}
