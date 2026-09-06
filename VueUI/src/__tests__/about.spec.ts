import { describe, expect, it } from "vitest";
import {
  ABOUT_LEDE,
  ABOUT_SECTIONS,
  aboutPageTitle,
  GITHUB_BUG_REPORT_URL,
  GITHUB_URL,
  SITE_URL,
  isInternalHref,
  KOFI_LABEL,
  KOFI_URL,
} from "@/logic/about";
import { DISCLAIMER } from "@/logic/attribution";

describe("about page copy", () => {
  it("describes the tool, local storage, and optional Ko-fi hosting support", () => {
    expect(aboutPageTitle()).toBe("About");
    expect(ABOUT_LEDE).toMatch(/loadout builder/i);
    expect(KOFI_URL).toBe("https://ko-fi.com/zalidane");
    expect(KOFI_LABEL).toBe("ko-fi.com/zalidane");

    const ids = ABOUT_SECTIONS.map((section) => section.id);
    expect(ids).toEqual(["what", "data", "support", "bugs", "credits"]);

    const what = ABOUT_SECTIONS.find((section) => section.id === "what");
    expect(what?.paragraphs.some((p) => p === DISCLAIMER)).toBe(true);
    expect(what?.paragraphs.join(" ")).toMatch(/not a combat sim/i);

    const data = ABOUT_SECTIONS.find((section) => section.id === "data");
    expect(data?.paragraphs.join(" ")).toMatch(/locally/i);
    expect(data?.paragraphs.join(" ")).toMatch(/JSON backup/i);
    expect(data?.links.map((link) => link.href)).toEqual(["/collection"]);

    const support = ABOUT_SECTIONS.find((section) => section.id === "support");
    expect(support?.paragraphs.join(" ")).toMatch(/optional/i);

    const bugs = ABOUT_SECTIONS.find((section) => section.id === "bugs");
    expect(bugs?.paragraphs.join(" ")).toMatch(/GitHub bug report/i);
    expect(GITHUB_BUG_REPORT_URL).toBe(
      `${GITHUB_URL}/issues/new?template=bug.yml`,
    );
    expect(SITE_URL).toBe("https://vueui-production.up.railway.app");
    expect(isInternalHref(GITHUB_BUG_REPORT_URL)).toBe(false);

    const credits = ABOUT_SECTIONS.find((section) => section.id === "credits");
    expect(credits?.links.map((link) => link.href)).toEqual([
      "/attributions",
      GITHUB_URL,
    ]);
    expect(isInternalHref("/attributions")).toBe(true);
    expect(isInternalHref(KOFI_URL)).toBe(false);
  });
});
