import { describe, expect, it } from "vitest";
import {
  cleanTraitDescriptionText,
  filterTraitBrowserItems,
  firstNonEmpty,
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
});
