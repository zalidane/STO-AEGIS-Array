import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createStoNewsCache } from "./stoNewsCache.js";
import { loadStoNewsFeed } from "../resolvers/StoNews.js";
import type { StoNewsFeed } from "./stoNewsRss.js";

const FRESH_RSS = `<?xml version="1.0"?>
<rss version="2.0"><channel>
<title>Star Trek Online</title>
<item>
  <title>Fresh Post</title>
  <description>Brand new patch notes.</description>
  <link>/en/games/star-trek-online/news/detail/999</link>
  <guid>https://www.arcgames.com/en/games/star-trek-online/news/detail/999</guid>
  <pubDate>Mon, 15 Sep 26 08:00:00 -0700</pubDate>
</item>
</channel></rss>`;

const STALE_RSS = `<?xml version="1.0"?>
<rss version="2.0"><channel>
<title>Star Trek Online</title>
<item>
  <title>Old Post</title>
  <description>Old news.</description>
  <link>/en/games/star-trek-online/news/detail/1</link>
  <guid>https://www.arcgames.com/en/games/star-trek-online/news/detail/1</guid>
  <pubDate>Fri, 21 Jun 24 08:00:00 -0700</pubDate>
</item>
</channel></rss>`;

describe("loadStoNewsFeed", () => {
  it("uses RSS when the feed is fresh", async () => {
    const feed = await loadStoNewsFeed({
      now: new Date("2026-09-22T00:00:00Z"),
      fetchers: {
        fetchRssText: async () => FRESH_RSS,
        fetchArcApiJson: async () => {
          throw new Error("API should not be called");
        },
      },
    });
    assert.equal(feed.sourceKind, "rss");
    assert.equal(feed.entries[0]?.title, "Fresh Post");
  });

  it("falls back to Arc API when RSS is stale", async () => {
    const feed = await loadStoNewsFeed({
      now: new Date("2026-09-22T00:00:00Z"),
      fetchers: {
        fetchRssText: async () => STALE_RSS,
        fetchArcApiJson: async () => ({
          news: [
            {
              id: "11583119",
              title: "Rediscovered Event!",
              summary: "Anti-Gorn weapons await.",
              updated: "2026-09-21 09:00:01",
            },
          ],
        }),
      },
    });
    assert.equal(feed.sourceKind, "arc-api");
    assert.equal(feed.entries[0]?.title, "Rediscovered Event!");
  });

  it("caches successful feeds", async () => {
    const cache = createStoNewsCache();
    let rssCalls = 0;
    const fetchers = {
      fetchRssText: async () => {
        rssCalls += 1;
        return FRESH_RSS;
      },
      fetchArcApiJson: async () => {
        throw new Error("unused");
      },
    };

    const first = await loadStoNewsFeed({
      limit: 10,
      now: new Date("2026-09-22T00:00:00Z"),
      cache,
      fetchers,
    });
    const second = await loadStoNewsFeed({
      limit: 10,
      now: new Date("2026-09-22T00:05:00Z"),
      cache,
      fetchers,
    });

    assert.equal(rssCalls, 1);
    assert.equal(first.entries[0]?.title, second.entries[0]?.title);
  });

  it("returns cached feed unchanged", async () => {
    const cache = createStoNewsCache();
    const canned: StoNewsFeed = {
      title: "Cached",
      sourceUrl: "https://example.test/rss",
      sourceKind: "rss",
      fetchedAt: new Date("2026-09-22T00:00:00Z"),
      entries: [
        {
          id: "1",
          title: "Cached item",
          link: "https://example.test/1",
          publishedAt: new Date("2026-09-20T00:00:00Z"),
          summary: "hi",
        },
      ],
    };
    cache.set("sto-news:v1:5", canned, 60_000, Date.parse("2026-09-22T00:00:00Z"));

    const feed = await loadStoNewsFeed({
      limit: 5,
      now: new Date("2026-09-22T00:00:30Z"),
      cache,
      fetchers: {
        fetchRssText: async () => {
          throw new Error("should use cache");
        },
        fetchArcApiJson: async () => {
          throw new Error("should use cache");
        },
      },
    });
    assert.equal(feed.title, "Cached");
  });
});
