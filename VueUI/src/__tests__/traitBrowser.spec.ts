import { describe, expect, it } from "vitest";
import {
  cleanTraitDescriptionText,
  filterTraitBrowserItems,
  firstNonEmpty,
  mapPersonalTraitToBrowserItem,
  mapStarshipTraitToBrowserItem,
  resolveSelectedTrait,
  traitBrowserMetaChips,
  type TraitBrowserItem,
} from "@/logic/traitBrowser";

const items: TraitBrowserItem[] = [
  {
    id: 1,
    name: "Arrest",
    listDescription: "Holds the target in place",
    detailDescription: "Full arrest description",
    source: "Constable specialization",
    type: "char",
    environment: "ground",
    career: null,
  },
  {
    id: 2,
    name: "Go for the Kill",
    listDescription: "Damage boost",
    detailDescription: "Detailed kill text",
    source: "Jem'Hadar ships",
    type: "starship",
    environment: null,
    career: null,
  },
];

describe("traitBrowser", () => {
  it("picks the first non-empty description candidate", () => {
    expect(firstNonEmpty("", "  ", "Basic", "Short")).toBe("Basic");
    expect(firstNonEmpty(null, undefined, "")).toBeNull();
  });

  it("turns HTML line breaks into real newlines", () => {
    expect(
      cleanTraitDescriptionText(
        "When controlled, remove Control effects&lt;br&gt;+100% Exploit Damage",
      ),
    ).toBe("When controlled, remove Control effects\n+100% Exploit Damage");
    expect(
      cleanTraitDescriptionText("First line<br/>Second line<br />Third"),
    ).toBe("First line\nSecond line\nThird");
  });

  it("strips leading wiki asterisks and colons from description lines", () => {
    expect(
      cleanTraitDescriptionText(
        "* When activating a mode:\n** To Foes: Taunt\n: Summons allies",
      ),
    ).toBe("When activating a mode:\nTo Foes: Taunt\nSummons allies");
  });

  it("filters by name and description text", () => {
    expect(filterTraitBrowserItems(items, "arrest").map((i) => i.id)).toEqual([
      1,
    ]);
    expect(filterTraitBrowserItems(items, "damage").map((i) => i.id)).toEqual([
      2,
    ]);
  });

  it("keeps selection when still present, otherwise falls back to first", () => {
    expect(resolveSelectedTrait(items, 2)?.id).toBe(2);
    expect(resolveSelectedTrait(items, 99)?.id).toBe(1);
    expect(resolveSelectedTrait([], 1)).toBeNull();
  });

  it("prefers explicit meta chips when provided", () => {
    expect(
      traitBrowserMetaChips({
        ...items[0]!,
        meta: [
          { label: "Region", value: "Space" },
          { label: "System", value: "" },
        ],
      }),
    ).toEqual([{ label: "Region", value: "Space" }]);
  });

  it("maps personal traits onto browser items", () => {
    const mapped = mapPersonalTraitToBrowserItem({
      id: 9,
      name: "Arrest",
      description: "* Holds the target",
      shortDescription: "Hold",
      source: "Constable",
      type: "char",
      environment: "ground",
      career: null,
    });
    expect(mapped.listDescription).toBe("Holds the target");
    expect(mapped.detailDescription).toBe("Holds the target");
    expect(mapped.source).toBe("Constable");
    expect(mapped.imageSrc).toBe("/images/traits/Arrest_icon.png");
  });

  it("maps starship traits with obtained ships onto browser items", () => {
    const mapped = mapStarshipTraitToBrowserItem({
      id: 4,
      name: "Go for the Kill",
      short: "Damage boost",
      basic: "Basic kill",
      detailed: "Detailed kill text",
      obtained: "Jem'Hadar ships",
      type: "starship",
      ships: [{ id: 2, name: "Jem'Hadar Attack Ship" }],
    });
    expect(mapped.listDescription).toBe("Damage boost");
    expect(mapped.detailDescription).toBe("Detailed kill text");
    expect(mapped.source).toBe("Jem'Hadar ships");
    expect(mapped.ships).toEqual([{ id: 2, name: "Jem'Hadar Attack Ship" }]);
  });
});
