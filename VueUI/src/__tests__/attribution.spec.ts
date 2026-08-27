import { describe, expect, it } from "vitest";
import {
  ATTRIBUTION_SECTIONS,
  attributionPageTitle,
  CC_BY_NC_SA_30_URL,
  DISCLAIMER,
  FOOTER_SUMMARY,
  footerAttributionLine,
  STOWIKI_COPYRIGHTS_URL,
  STOWIKI_HOME_URL,
  STOWIKI_OFFICIAL_IMAGES_URL,
} from "@/logic/attribution";

describe("attribution", () => {
  it("exposes a stable footer summary that credits wiki text and image rights holders", () => {
    expect(footerAttributionLine()).toBe(FOOTER_SUMMARY);
    expect(FOOTER_SUMMARY).toMatch(/STOWiki/);
    expect(FOOTER_SUMMARY).toMatch(/CC BY-NC-SA 3\.0/);
    expect(FOOTER_SUMMARY).toMatch(/Cryptic/);
  });

  it("includes wiki text and image sections with required license links", () => {
    expect(attributionPageTitle()).toBe("Attributions");
    expect(DISCLAIMER).toMatch(/unofficial fan project/i);

    const ids = ATTRIBUTION_SECTIONS.map((section) => section.id);
    expect(ids).toEqual(["ip", "text", "images"]);

    const text = ATTRIBUTION_SECTIONS.find((section) => section.id === "text");
    expect(text?.links.map((link) => link.href)).toEqual([
      STOWIKI_COPYRIGHTS_URL,
      CC_BY_NC_SA_30_URL,
    ]);

    const images = ATTRIBUTION_SECTIONS.find(
      (section) => section.id === "images",
    );
    expect(images?.links.some((link) => link.href === STOWIKI_OFFICIAL_IMAGES_URL)).toBe(
      true,
    );
    expect(images?.links.some((link) => link.href === STOWIKI_HOME_URL)).toBe(
      true,
    );
  });
});
