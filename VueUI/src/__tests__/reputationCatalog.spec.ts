import { describe, expect, it } from "vitest";
import {
  REPUTATION_BROWSER_TITLE,
  filterReputationCatalog,
  reputationCatalogKind,
  reputationKindLabel,
  reputationTabEmptyMessage,
} from "@/logic/reputationCatalog";

const rows = [
  { id: 1, name: "Task Force Omega", environment: null },
  { id: 2, name: "New Romulus", environment: "   " },
  { id: 3, name: "Pilot", environment: "space" },
  { id: 4, name: "Commando", environment: "ground" },
];

describe("reputation catalog split", () => {
  it("treats an empty environment as a reputation", () => {
    expect(reputationCatalogKind(null)).toBe("reputation");
    expect(reputationCatalogKind("")).toBe("reputation");
    expect(reputationCatalogKind("  ")).toBe("reputation");
    expect(reputationKindLabel(null)).toBe("Reputation");
  });

  it("treats any environment value as a specialization", () => {
    expect(reputationCatalogKind("space")).toBe("specialization");
    expect(reputationCatalogKind("both")).toBe("specialization");
    expect(reputationKindLabel("ground")).toBe("Specialization");
  });

  it("splits the catalog into the two tabs", () => {
    expect(filterReputationCatalog(rows, "reputation").map((row) => row.id)).toEqual([
      1, 2,
    ]);
    expect(
      filterReputationCatalog(rows, "specialization").map((row) => row.name),
    ).toEqual(["Pilot", "Commando"]);
  });

  it("names the browser and empty tabs", () => {
    expect(REPUTATION_BROWSER_TITLE).toBe("Reputations and Specializations");
    expect(reputationTabEmptyMessage("reputation")).toBe(
      "No reputations in this list.",
    );
    expect(reputationTabEmptyMessage("specialization")).toBe(
      "No specializations in this list.",
    );
  });
});
