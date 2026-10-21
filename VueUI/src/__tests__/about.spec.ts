import { describe, expect, it } from "vitest";
import {
  ABOUT_LEDE,
  ABOUT_SECTIONS,
  aboutPageTitle,
  DEFAULT_DISCORD_URL,
  DISCORD_LABEL,
  DISCORD_URL,
  GITHUB_BUG_REPORT_URL,
  GITHUB_URL,
  RAILWAY_REFERRAL_URL,
  SITE_URL,
  isInternalHref,
  KOFI_LABEL,
  KOFI_URL,
  resolveDiscordUrl,
  resolveRailwayReferralUrl,
} from "@/logic/about";
import { DISCLAIMER } from "@/logic/attribution";

describe("about page copy", () => {
  it("describes the tool, local storage, Discord community, and optional Ko-fi hosting support", () => {
    expect(aboutPageTitle()).toBe("About");
    expect(ABOUT_LEDE).toMatch(/loadout builder/i);
    expect(KOFI_URL).toBe("https://ko-fi.com/zalidane");
    expect(KOFI_LABEL).toBe("ko-fi.com/zalidane");
    expect(DISCORD_URL).toBe(DEFAULT_DISCORD_URL);
    expect(DISCORD_URL).toBe("https://discord.gg/2jTgb9HnY");
    expect(RAILWAY_REFERRAL_URL).toBeNull();
    expect(DISCORD_LABEL).toBe("Join Discord");

    const ids = ABOUT_SECTIONS.map((section) => section.id);
    expect(ids).toEqual([
      "what",
      "data",
      "community",
      "support",
      "bugs",
      "credits",
    ]);

    const what = ABOUT_SECTIONS.find((section) => section.id === "what");
    expect(what?.paragraphs.some((p) => p === DISCLAIMER)).toBe(true);
    expect(what?.paragraphs.join(" ")).toMatch(/not a combat sim/i);

    const data = ABOUT_SECTIONS.find((section) => section.id === "data");
    expect(data?.paragraphs.join(" ")).toMatch(/locally/i);
    expect(data?.paragraphs.join(" ")).toMatch(/JSON backup/i);
    expect(data?.links.map((link) => link.href)).toEqual(["/collection"]);

    const community = ABOUT_SECTIONS.find(
      (section) => section.id === "community",
    );
    expect(community?.paragraphs.join(" ")).toMatch(/Discord/i);

    const support = ABOUT_SECTIONS.find((section) => section.id === "support");
    expect(support?.paragraphs.join(" ")).toMatch(/optional/i);

    const bugs = ABOUT_SECTIONS.find((section) => section.id === "bugs");
    expect(bugs?.paragraphs.join(" ")).toMatch(/GitHub bug report/i);
    expect(GITHUB_BUG_REPORT_URL).toBe(
      `${GITHUB_URL}/issues/new?template=bug.yml`,
    );
    expect(SITE_URL).toBe("https://vueui-production.up.railway.app");
    expect(isInternalHref(GITHUB_BUG_REPORT_URL)).toBe(false);
    expect(isInternalHref(DISCORD_URL)).toBe(false);

    const credits = ABOUT_SECTIONS.find((section) => section.id === "credits");
    expect(credits?.links.map((link) => link.href)).toEqual([
      "/attributions",
      GITHUB_URL,
    ]);
    expect(isInternalHref("/attributions")).toBe(true);
    expect(isInternalHref(KOFI_URL)).toBe(false);
  });
});

describe("resolveDiscordUrl", () => {
  it("keeps the current invite when unset, blank, or whitespace", () => {
    expect(resolveDiscordUrl(undefined)).toBe(DEFAULT_DISCORD_URL);
    expect(resolveDiscordUrl(null)).toBe("https://discord.gg/2jTgb9HnY");
    expect(resolveDiscordUrl("")).toBe(DEFAULT_DISCORD_URL);
    expect(resolveDiscordUrl("   ")).toBe(DEFAULT_DISCORD_URL);
  });

  it("uses a trimmed configured invite", () => {
    expect(resolveDiscordUrl("  https://discord.gg/newInvite  ")).toBe(
      "https://discord.gg/newInvite",
    );
  });
});

describe("resolveRailwayReferralUrl", () => {
  it("returns null when the code is unset, blank, or whitespace", () => {
    expect(resolveRailwayReferralUrl(undefined)).toBeNull();
    expect(resolveRailwayReferralUrl(null)).toBeNull();
    expect(resolveRailwayReferralUrl("")).toBeNull();
    expect(resolveRailwayReferralUrl("   ")).toBeNull();
  });

  it("builds https://railway.com?referralCode=<code>", () => {
    expect(resolveRailwayReferralUrl("aegis")).toBe(
      "https://railway.com?referralCode=aegis",
    );
    expect(resolveRailwayReferralUrl("  aegis  ")).toBe(
      "https://railway.com?referralCode=aegis",
    );
    expect(resolveRailwayReferralUrl("a b&c")).toBe(
      "https://railway.com?referralCode=a%20b%26c",
    );
  });
});
