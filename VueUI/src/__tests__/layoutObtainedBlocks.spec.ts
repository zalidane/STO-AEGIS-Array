import { describe, expect, it } from "vitest";
import { parseObtainedMarkup } from "@/logic/parseObtainedMarkup";
import {
  layoutObtainedBlocks,
  stripTrailingPeriods,
} from "@/logic/layoutObtainedBlocks";
import {
  buildShipRefMap,
  lookupShipRef,
  normalizeShipLookupKey,
  resolveObtainedLink,
  buildNameIdMap,
} from "@/logic/resolveObtainedLinks";
import {
  factionMarkKey,
  resolveFactionThemeColor,
  resolvePrimaryFaction,
  type FactionIdentity,
} from "@/logic/resolvePrimaryFaction";

type Ship = {
  id: number;
  name: string;
  displayClass?: string | null;
  displayPrefix?: string | null;
  displayType?: string | null;
} & FactionIdentity;

const ships: Ship[] = [
  {
    id: 1,
    name: "Pathfinder Long Range Science Vessel",
    factionLede: "Federation",
  },
  {
    id: 2,
    name: "Legendary Intrepid Miracle Worker Multi-Mission Science Vessel",
    factionLede: "Federation",
  },
  {
    id: 3,
    name: "Voth Stronghold Miracle Worker Dreadnought Cruiser",
    factionLede: "Cross-Faction",
    faction: "Dominion",
    facSort: "d",
  },
  {
    id: 127,
    name: "Denorios Bajoran Interceptor",
    displayClass: "Denorios",
    displayPrefix: "Bajoran",
    displayType: "Interceptor",
    factionLede: "Cross-Faction",
  },
  {
    id: 7547,
    name: "Jem'Hadar Recon Ship",
    factionLede: "Dominion",
  },
  {
    id: 7548,
    name: "Jem'Hadar Strike Ship",
    factionLede: "Dominion",
  },
  {
    id: 7626,
    name: "Legendary Jem'Hadar Vanguard Pilot Attack Ship",
    factionLede: "Dominion",
  },
];

const shipMap = buildShipRefMap(ships);

function lookup(page: string) {
  return lookupShipRef(shipMap, page);
}

function resolveMark(ship: Ship | undefined) {
  if (!ship) return null;
  const primary = resolvePrimaryFaction(ship);
  if (!primary) return null;
  const key = factionMarkKey(primary);
  const letter =
    key === "federation"
      ? "F"
      : key === "klingon"
        ? "K"
        : key === "romulan"
          ? "R"
          : key === "dominion"
            ? "D"
            : key === "cross"
              ? "C"
              : "";
  if (!letter) return null;
  return {
    letter,
    color: resolveFactionThemeColor(ship),
    title: primary,
  };
}

describe("normalizeShipLookupKey", () => {
  it("strips -class from wiki ship titles", () => {
    expect(normalizeShipLookupKey("Denorios-class Bajoran Interceptor")).toBe(
      "denorios bajoran interceptor",
    );
    expect(normalizeShipLookupKey("Denorios Bajoran Interceptor")).toBe(
      "denorios bajoran interceptor",
    );
  });
});

describe("stripTrailingPeriods", () => {
  it("removes a trailing period after a link", () => {
    expect(
      stripTrailingPeriods([
        { type: "text", value: "spent into the" },
        {
          type: "link",
          page: "Constable (specialization)",
          label: "Constable specialization",
        },
        { type: "text", value: "." },
      ]),
    ).toEqual([
      { type: "text", value: "spent into the" },
      {
        type: "link",
        page: "Constable (specialization)",
        label: "Constable specialization",
      },
    ]);
  });
});

describe("layoutObtainedBlocks", () => {
  it("groups same-faction ships onto one icon and drops ampersands", () => {
    const tokens = parseObtainedMarkup(
      '*<span title="Federation only">[[File:Faction Federation.png|16px]]</span> [[Pathfinder Long Range Science Vessel]] & [[Legendary Intrepid Miracle Worker Multi-Mission Science Vessel]]',
    );
    const blocks = layoutObtainedBlocks(tokens, lookup, resolveMark);
    expect(blocks).toEqual([
      {
        kind: "shipGroup",
        mark: {
          letter: "F",
          color: "federation",
          title: "Federation",
        },
        factionKey: "federation",
        ships: [
          {
            page: "Pathfinder Long Range Science Vessel",
            label: "Pathfinder Long Range Science Vessel",
          },
          {
            page: "Legendary Intrepid Miracle Worker Multi-Mission Science Vessel",
            label:
              "Legendary Intrepid Miracle Worker Multi-Mission Science Vessel",
          },
        ],
      },
    ]);
  });

  it("merges consecutive same-faction ship rows under one icon", () => {
    const tokens = parseObtainedMarkup(
      `*<span title="Khitomer">[[File:Faction Khitomer.png|16px]]</span> [[Jem'Hadar Recon Ship]]
*<span title="Khitomer">[[File:Faction Khitomer.png|16px]]</span> [[Jem'Hadar Strike Ship]]
*<span title="Khitomer">[[File:Faction Khitomer.png|16px]]</span> [[Legendary Jem'Hadar Vanguard Pilot Attack Ship]]`,
    );
    const blocks = layoutObtainedBlocks(tokens, lookup, resolveMark);
    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toMatchObject({
      kind: "shipGroup",
      mark: { letter: "D", color: "dominion" },
      ships: [
        { page: "Jem'Hadar Recon Ship" },
        { page: "Jem'Hadar Strike Ship" },
        { page: "Legendary Jem'Hadar Vanguard Pilot Attack Ship" },
      ],
    });
  });

  it("keeps non-ship sources as a single inline block without trailing periods", () => {
    const tokens = parseObtainedMarkup(
      "*<u>Arrest</u>: 15 points spent into the [[Constable (specialization)|Constable specialization]].",
    );
    const blocks = layoutObtainedBlocks(tokens, lookup, resolveMark);
    expect(blocks).toHaveLength(1);
    expect(blocks[0]?.kind).toBe("inline");
    if (blocks[0]?.kind !== "inline") return;
    expect(blocks[0].tokens.some((token) => token.type === "break")).toBe(
      false,
    );
    expect(
      blocks[0].tokens
        .filter((token) => token.type === "text")
        .map((token) => (token.type === "text" ? token.value : "")),
    ).not.toContain(".");
    expect(blocks[0].tokens.at(-1)).toMatchObject({
      type: "link",
      label: "Constable specialization",
    });
  });

  it("keeps multi-line non-ship sources like Arrest", () => {
    const tokens = parseObtainedMarkup(
      "*<u>Arrest</u>: 15 points spent into the [[Constable (specialization)|Constable specialization]].\n*<u>Improved Arrest</u>: [[Gamma Recruitment]] account-wide reward after spending 45 points in any specializations.",
    );
    const blocks = layoutObtainedBlocks(tokens, () => undefined, () => null);
    expect(blocks).toHaveLength(2);
    expect(blocks.every((block) => block.kind === "inline")).toBe(true);
  });

  it("treats unresolved faction+ship lines as boxed ship groups", () => {
    const tokens = parseObtainedMarkup(
      "*<span title=\"Klingon only\">[[File:Faction Klingon.png|16px]]</span> [[Ty'Gokor Command Battlecruiser]]",
    );
    const blocks = layoutObtainedBlocks(tokens, () => undefined, () => null);
    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toMatchObject({
      kind: "shipGroup",
      mark: { letter: "K", color: "klingon" },
      ships: [{ page: "Ty'Gokor Command Battlecruiser" }],
    });
  });

  it("resolves Denorios-class wiki titles to the DB ship name", () => {
    const tokens = parseObtainedMarkup(
      '*<span title="Khitomer">[[File:Faction Khitomer.png|16px]]</span> [[Denorios-class Bajoran Interceptor]]',
    );
    const blocks = layoutObtainedBlocks(tokens, lookup, resolveMark);
    expect(blocks[0]).toMatchObject({
      kind: "shipGroup",
      mark: { letter: "C", color: "neutral" },
      ships: [{ page: "Denorios-class Bajoran Interceptor" }],
    });
    expect(
      resolveObtainedLink("Denorios-class Bajoran Interceptor", {
        shipsByName: buildNameIdMap(ships),
      }),
    ).toEqual({ name: "ship-details", params: { id: 127 } });
  });

  it("uses factionLede for cross-faction ship marks", () => {
    const tokens = parseObtainedMarkup(
      "[[Voth Stronghold Miracle Worker Dreadnought Cruiser]]",
    );
    const blocks = layoutObtainedBlocks(tokens, lookup, resolveMark);
    expect(blocks[0]).toMatchObject({
      kind: "shipGroup",
      mark: { letter: "C", color: "neutral" },
      ships: [
        {
          page: "Voth Stronghold Miracle Worker Dreadnought Cruiser",
        },
      ],
    });
  });
});
