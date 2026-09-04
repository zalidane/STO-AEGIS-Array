import { describe, expect, it } from "vitest";
import {
  cleanTraitDescriptionText,
  displayTraitEnvironment,
  displayTraitType,
  filterTraitBrowserItems,
  firstNonEmpty,
  mapPersonalTraitToBrowserItem,
  mapStarshipTraitToBrowserItem,
  resolveSelectedTrait,
  traitBrowserMetaChips,
  uniqueTraitFacetValues,
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

  it("flattens wiki links in personal trait copy (Field Technician)", () => {
    expect(cleanTraitDescriptionText("* -10% [[Kit]] Recharge Time")).toBe(
      "-10% Kit Recharge Time",
    );
  });

  it("flattens piped wiki links and italics in starship trait copy", () => {
    expect(
      cleanTraitDescriptionText(
        "* Activating any Hull Healing Bridge Officer Ability or [[Intelligence Officer (specialization)#Bridge Officer Abilities|Intelligence]] Bridge Officer Ability will cause you to begin reflecting incoming damage from Energy Weapons back at your attackers as [[Damage_type_(space)#Disruptor| Disruptor Damage]].",
      ),
    ).toBe(
      "Activating any Hull Healing Bridge Officer Ability or Intelligence Bridge Officer Ability will cause you to begin reflecting incoming damage from Energy Weapons back at your attackers as Disruptor Damage.",
    );
    expect(
      cleanTraitDescriptionText(
        "When activating any Hull Heal or Intel Bridge Officer Ability:\n* Apply &#039;&#039;Revenge&#039;&#039; to Self for 30 sec, or increase stack size by 1 (max 5 stacks)",
      ),
    ).toBe(
      "When activating any Hull Heal or Intel Bridge Officer Ability:\nApply Revenge to Self for 30 sec, or increase stack size by 1 (max 5 stacks)",
    );
  });

  it("drops file tokens, keeps piped labels, and suffixes after bare links", () => {
    expect(
      cleanTraitDescriptionText(
        "Available for 200[[File:Lobi Crystal icon.png|14px|link=Lobi Crystal]] from the Lobi Crystal Consortium",
      ),
    ).toBe("Available for 200 from the Lobi Crystal Consortium");
    expect(
      cleanTraitDescriptionText(
        "[[Ability: Go Down Fighting|Go Down Fighting]] can be used at any Hull Integrity.",
      ),
    ).toBe("Go Down Fighting can be used at any Hull Integrity.");
    expect(
      cleanTraitDescriptionText(
        "spending time [[cloak]]ed or in [[Dark Mode (ability)|Dark Mode]]",
      ),
    ).toBe("spending time cloaked or in Dark Mode");
  });

  it("flattens Absolute Candor piped wiki links in cargo HTML", () => {
    expect(
      cleanTraitDescriptionText(
        "When controlled, remove Control effects (20 sec recharge) &lt;br&gt;+100% [[Exploit attack|Exploit]] Damage",
      ),
    ).toBe(
      "When controlled, remove Control effects (20 sec recharge)\n+100% Exploit Damage",
    );
  });

  it("filters by name and description text", () => {
    expect(filterTraitBrowserItems(items, "arrest").map((i) => i.id)).toEqual([
      1,
    ]);
    expect(filterTraitBrowserItems(items, "damage").map((i) => i.id)).toEqual([
      2,
    ]);
  });

  it("filters by type and environment facets", () => {
    expect(
      filterTraitBrowserItems(items, "", { types: ["char"] }).map((i) => i.id),
    ).toEqual([1]);
    expect(
      filterTraitBrowserItems(items, "", { environments: ["ground"] }).map(
        (i) => i.id,
      ),
    ).toEqual([1]);
    expect(
      filterTraitBrowserItems(items, "kill", { types: ["char"] }).map(
        (i) => i.id,
      ),
    ).toEqual([]);
    expect(
      filterTraitBrowserItems(items, "", {
        hideCollected: true,
        collectedIds: new Set([1]),
      }).map((i) => i.id),
    ).toEqual([2]);
    expect(
      filterTraitBrowserItems(items, "", { hideCollected: true }).map(
        (i) => i.id,
      ),
    ).toEqual([1, 2]);
    expect(uniqueTraitFacetValues(items, "type")).toEqual(["char", "starship"]);
    expect(uniqueTraitFacetValues(items, "environment")).toEqual(["ground"]);
  });

  it("labels cargo type codes for filters and chips", () => {
    expect(displayTraitType("char")).toBe("Personal");
    expect(displayTraitType("boff")).toBe("Bridge officer");
    expect(displayTraitEnvironment("ground")).toBe("Ground");
    expect(traitBrowserMetaChips(items[0])).toEqual([
      { label: "Type", value: "Personal" },
      { label: "Environment", value: "Ground" },
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
      name: "Field Technician",
      description: "* -10% [[Kit]] Recharge Time",
      shortDescription: "Reduces recharge time for Kit abilities.",
      source: "Innate to all captains.",
      type: "char",
      environment: "ground",
      career: null,
    });
    expect(mapped.listDescription).toBe("-10% Kit Recharge Time");
    expect(mapped.detailDescription).toBe("-10% Kit Recharge Time");
    expect(mapped.listDescription).not.toMatch(/\[\[|\]\]/);
    expect(mapped.source).toBe("Innate to all captains.");
    expect(mapped.imageSrc).toBe("/images/traits/Field_Technician_icon.png");
  });

  it("maps starship traits with obtained ships onto browser items", () => {
    const mapped = mapStarshipTraitToBrowserItem({
      id: 4,
      name: "Shall We Not Revenge",
      short: "Hull Heal + Intel Boff Abilities add Energy Damage Reflect.",
      basic:
        "* Activating any Hull Healing Bridge Officer Ability or [[Intelligence Officer (specialization)#Bridge Officer Abilities|Intelligence]] Bridge Officer Ability will cause you to begin reflecting incoming damage from Energy Weapons back at your attackers as [[Damage_type_(space)#Disruptor| Disruptor Damage]].",
      detailed:
        "When activating any Hull Heal or Intel Bridge Officer Ability:\n* Apply &#039;&#039;Revenge&#039;&#039; to Self for 30 sec",
      obtained: "Legendary D7 Intel Battlecruiser",
      type: "faction-specific",
      ships: [{ id: 2, name: "Legendary D7 Intel Battlecruiser" }],
    });
    expect(mapped.listDescription).toBe(
      "Hull Heal + Intel Boff Abilities add Energy Damage Reflect.",
    );
    expect(mapped.detailDescription).toBe(
      "When activating any Hull Heal or Intel Bridge Officer Ability:\nApply Revenge to Self for 30 sec",
    );
    expect(mapped.detailDescription).not.toMatch(/\[\[|\]\]|''/);
    expect(mapped.source).toBe("Legendary D7 Intel Battlecruiser");
    expect(mapped.ships).toEqual([
      { id: 2, name: "Legendary D7 Intel Battlecruiser" },
    ]);
  });
});
