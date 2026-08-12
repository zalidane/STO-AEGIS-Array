import { describe, expect, it } from "vitest";
import {
  collectObtainedLinkPages,
  parseObtainedMarkup,
} from "@/logic/parseObtainedMarkup";
import {
  buildNameIdMap,
  resolveObtainedLink,
} from "@/logic/resolveObtainedLinks";

describe("parseObtainedMarkup", () => {
  it("converts faction file HTML into icons and ship wiki links", () => {
    const raw =
      "*&lt;span title=&quot;Khitomer&quot;&gt;[[File:Faction Khitomer.png|16px|link=Cross-Faction Content]]&lt;/span&gt; [[Miradorn Theta Heavy Raider]]";

    const tokens = parseObtainedMarkup(raw);

    expect(tokens).toEqual([
      { type: "bullet" },
      {
        type: "factionIcon",
        faction: "cross",
        title: "Khitomer",
      },
      { type: "link", page: "Miradorn Theta Heavy Raider", label: "Miradorn Theta Heavy Raider" },
    ]);
  });

  it("keeps display labels for piped wiki links", () => {
    const tokens = parseObtainedMarkup(
      "[[Constable (specialization)|Constable specialization]]",
    );
    expect(tokens).toEqual([
      {
        type: "link",
        page: "Constable (specialization)",
        label: "Constable specialization",
      },
    ]);
  });

  it("maps federation / klingon / romulan icons and collects pages", () => {
    const tokens = parseObtainedMarkup(
      "*&lt;span title=&quot;Federation only&quot;&gt;[[File:Faction Federation.png|16px]]&lt;/span&gt; [[Klein Temporal Destroyer]]\n*&lt;span title=&quot;Klingon only&quot;&gt;[[File:Faction Klingon.png|16px]]&lt;/span&gt; [[Chargh&#039;poH Temporal Destroyer]]",
    );

    expect(tokens.filter((t) => t.type === "factionIcon")).toEqual([
      { type: "factionIcon", faction: "federation", title: "Federation only" },
      { type: "factionIcon", faction: "klingon", title: "Klingon only" },
    ]);
    expect(collectObtainedLinkPages(tokens)).toEqual([
      "Klein Temporal Destroyer",
      "Chargh'poH Temporal Destroyer",
    ]);
  });

  it("turns very-rare file markers into rarity icons", () => {
    const tokens = parseObtainedMarkup(
      "[[File:very rare icon.png|16px]] from the [[Discovery: Emerald Chain Lock Box]]",
    );
    expect(tokens.some((t) => t.type === "rarityIcon")).toBe(true);
    expect(
      tokens.find((t) => t.type === "link" && t.page.includes("Emerald")),
    ).toMatchObject({
      type: "link",
      page: "Discovery: Emerald Chain Lock Box",
    });
  });

  it("strips nested HTML and bracket wrappers from Ceaseless Momentum obtained text", () => {
    const raw =
      "*&lt;span title=&quot;Klingon only&quot;&gt;[[File:Faction Klingon.png|16px|link=Klingon-only]]&lt;/span&gt; [[Na&#039;Qjej Intel Battlecruiser]]\n*&lt;span title=&quot;Federation only&quot;&gt;[[File:Faction Federation.png|16px|link=Starfleet-only]]&lt;/span&gt; &lt;span style=&quot;font-family:&#039;FuturaBody&#039;, Tahoma, Geneva, Arial;&quot; class=&quot;rare lht-data&quot;&gt;&amp;#91;[[Starship Trait: Ceaseless Momentum (Federation)|&lt;span class=&quot;rare&quot;&gt;Starship Trait: Ceaseless Momentum (Federation)&lt;/span&gt;]]&amp;#93;&lt;/span&gt; &#039;&#039;(Retired)&#039;&#039;";

    const tokens = parseObtainedMarkup(raw);
    const serialized = tokens
      .map((token) => {
        if (token.type === "text") return token.value;
        if (token.type === "link") return token.label;
        if (token.type === "factionIcon") return `[${token.faction}]`;
        if (token.type === "bullet") return "*";
        if (token.type === "break") return "\n";
        return "";
      })
      .join(" ");

    expect(serialized).not.toMatch(/<span|font-family|class=|&lt;|&gt;/i);
    expect(serialized).toContain("Na'Qjej Intel Battlecruiser");
    expect(serialized).toContain("Starship Trait: Ceaseless Momentum (Federation)");
    expect(serialized).toContain("(Retired)");
    expect(
      tokens.some(
        (token) =>
          token.type === "link" &&
          token.page === "Starship Trait: Ceaseless Momentum (Federation)" &&
          !/<span/i.test(token.label),
      ),
    ).toBe(true);
  });
});

describe("resolveObtainedLink", () => {
  it("prefers ships, then infoboxes, and ignores starship-trait search noise", () => {
    const shipsByName = buildNameIdMap([
      { id: 501, name: "Miradorn Theta Heavy Raider" },
    ]);
    const infoboxesByName = buildNameIdMap([
      { id: 46172, name: "Discovery: Emerald Chain Lock Box" },
    ]);

    expect(
      resolveObtainedLink("Miradorn Theta Heavy Raider", { shipsByName }),
    ).toEqual({ name: "ship-details", params: { id: 501 } });

    expect(
      resolveObtainedLink("Discovery: Emerald Chain Lock Box", {
        shipsByName,
        infoboxesByName,
      }),
    ).toEqual({ name: "infobox-details", params: { id: 46172 } });

    expect(
      resolveObtainedLink("Discovery: Emerald Chain Lock Box", {
        shipsByName,
        searchHitsByName: new Map([
          [
            "discovery: emerald chain lock box",
            {
              type: "StarshipTrait",
              id: 39,
              name: "Discovery: Emerald Chain Lock Box",
            },
          ],
        ]),
      }),
    ).toBeNull();
  });
});
