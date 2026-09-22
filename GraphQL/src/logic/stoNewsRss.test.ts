import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  absolutizeStoNewsUrl,
  htmlToSnippet,
  limitFeedEntries,
  mapArcApiNewsItem,
  mapArcApiNewsResponse,
  newestEntryDate,
  parseRssDate,
  parseStoNewsRss,
  shouldPreferRssFeed,
  STO_NEWS_RSS_URL,
} from "./stoNewsRss.js";

const SAMPLE_RSS = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title><![CDATA[Star Trek Online]]></title>
    <link>/en/games/star-trek-online/news</link>
    <item>
      <title><![CDATA[The Galaxy Goes to Red Alert]]></title>
      <description><![CDATA[
        <p>The entire Galaxy is going to Red Alert!</p>
        <style>.share-footer a { opacity: .5; }</style>
        <script>$(document).ready(function(){});</script>
        <p>From June 25th at 8am PT to July 2nd at 12pm PT on PC.</p>
      ]]></description>
      <link>/en/games/star-trek-online/news/detail/11569706-the-galaxy-goes-to-red-alert</link>
      <guid isPermaLink="false">https://www.arcgames.com/en/games/star-trek-online/news/detail/11569706</guid>
      <pubDate>Fri, 21 Jun 24 08:00:00 -0700</pubDate>
    </item>
    <item>
      <title><![CDATA[Patch Notes for 6/20/24]]></title>
      <description><![CDATA[Event – Delete Alt Control: Captains can earn daily progress.]]></description>
      <link>/en/games/star-trek-online/news/detail/11569676-patch-notes</link>
      <guid isPermaLink="false">https://www.arcgames.com/en/games/star-trek-online/news/detail/11569676</guid>
      <pubDate>Thu, 20 Jun 24 00:00:00 -0700</pubDate>
    </item>
  </channel>
</rss>`;

describe("htmlToSnippet", () => {
  it("strips tags, scripts, and styles then truncates cleanly", () => {
    const snippet = htmlToSnippet(
      `<p>Hello &amp; welcome</p><style>.x{}</style><script>alert(1)</script><p>${"word ".repeat(80)}</p>`,
      40,
    );
    assert.equal(snippet.includes("<"), false);
    assert.equal(snippet.includes("alert"), false);
    assert.equal(snippet.includes(".x"), false);
    assert.match(snippet, /Hello & welcome/);
    assert.ok(snippet.endsWith("…"));
    assert.ok(snippet.length <= 41);
  });
});

describe("parseStoNewsRss", () => {
  it("maps titles, absolute links, dates, ids, and snippets", () => {
    const feed = parseStoNewsRss(SAMPLE_RSS, {
      sourceUrl: STO_NEWS_RSS_URL,
      fetchedAt: new Date("2026-09-22T00:00:00Z"),
    });

    assert.equal(feed.title, "Star Trek Online");
    assert.equal(feed.sourceKind, "rss");
    assert.equal(feed.sourceUrl, STO_NEWS_RSS_URL);
    assert.equal(feed.entries.length, 2);

    const first = feed.entries[0]!;
    assert.equal(first.id, "11569706");
    assert.equal(first.title, "The Galaxy Goes to Red Alert");
    assert.equal(
      first.link,
      "https://www.arcgames.com/en/games/star-trek-online/news/detail/11569706-the-galaxy-goes-to-red-alert",
    );
    assert.ok(first.publishedAt);
    assert.equal(first.publishedAt!.toISOString(), "2024-06-21T15:00:00.000Z");
    assert.match(first.summary, /The entire Galaxy is going to Red Alert/);
    assert.equal(first.summary.includes("share-footer"), false);
    assert.equal(first.summary.includes("document.ready"), false);
  });
});

describe("absolutizeStoNewsUrl / parseRssDate", () => {
  it("resolves relative Arc paths", () => {
    assert.equal(
      absolutizeStoNewsUrl("/en/games/star-trek-online/news"),
      "https://www.arcgames.com/en/games/star-trek-online/news",
    );
  });

  it("parses two-digit RSS years", () => {
    const date = parseRssDate("Fri, 21 Jun 24 08:00:00 -0700");
    assert.ok(date);
    assert.equal(date!.getUTCFullYear(), 2024);
  });
});

describe("Arc API mapping + RSS freshness preference", () => {
  it("maps Arc JSON news rows into entries", () => {
    const entry = mapArcApiNewsItem({
      id: "11583119",
      title: "Rediscovered Event!",
      summary: "Participate in the Rediscovered Event on PC.",
      updated: "2026-09-21 09:00:01",
    });
    assert.ok(entry);
    assert.equal(entry!.id, "11583119");
    assert.equal(
      entry!.link,
      "https://www.arcgames.com/en/news/article/11583119",
    );
    assert.ok(entry!.publishedAt);
    assert.equal(entry!.publishedAt!.toISOString(), "2026-09-21T09:00:01.000Z");
  });

  it("prefers RSS only when newest item is recent", () => {
    const stale = parseStoNewsRss(SAMPLE_RSS, {
      fetchedAt: new Date("2026-09-22T00:00:00Z"),
    });
    assert.equal(
      shouldPreferRssFeed(stale, new Date("2026-09-22T00:00:00Z")),
      false,
    );

    const freshXml = SAMPLE_RSS.replace(
      "Fri, 21 Jun 24 08:00:00 -0700",
      "Mon, 15 Sep 26 08:00:00 -0700",
    );
    const fresh = parseStoNewsRss(freshXml, {
      fetchedAt: new Date("2026-09-22T00:00:00Z"),
    });
    assert.equal(
      shouldPreferRssFeed(fresh, new Date("2026-09-22T00:00:00Z")),
      true,
    );
    assert.ok(newestEntryDate(fresh.entries));
  });

  it("limits mapped API feeds", () => {
    const feed = mapArcApiNewsResponse({
      news: [
        { id: "1", title: "A", summary: "a", updated: "2026-09-21 01:00:00" },
        { id: "2", title: "B", summary: "b", updated: "2026-09-20 01:00:00" },
        { id: "3", title: "C", summary: "c", updated: "2026-09-19 01:00:00" },
      ],
    });
    const limited = limitFeedEntries(feed, 2);
    assert.equal(limited.entries.length, 2);
    assert.equal(limited.sourceKind, "arc-api");
  });
});
