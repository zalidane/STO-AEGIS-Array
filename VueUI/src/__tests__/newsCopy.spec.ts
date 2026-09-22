import { describe, it, expect } from "vitest";
import {
  NEWS_PAGE_TITLE,
  formatNewsPublishedAt,
  newsSourceKindLabel,
} from "@/logic/news/copy";

describe("news copy helpers", () => {
  it("labels RSS vs Arc API sources", () => {
    expect(NEWS_PAGE_TITLE).toBe("News");
    expect(newsSourceKindLabel("rss")).toMatch(/RSS/i);
    expect(newsSourceKindLabel("arc-api")).toMatch(/API/i);
  });

  it("formats published dates for the list", () => {
    expect(formatNewsPublishedAt("2026-09-21T09:00:01.000Z")).toMatch(/2026/);
    expect(formatNewsPublishedAt(null)).toBe("");
    expect(formatNewsPublishedAt("not-a-date")).toBe("");
  });
});
