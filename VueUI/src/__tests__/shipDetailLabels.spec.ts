import { describe, expect, it } from "vitest";
import {
  densityFromWidth,
  getShipDetailLabels,
  SHIP_DETAIL_FULL_LABELS,
} from "@/logic/shipDetailLabels";

describe("densityFromWidth", () => {
  it("selects denser labels as the viewport shrinks", () => {
    expect(densityFromWidth(1920)).toBe("comfortable");
    expect(densityFromWidth(1440)).toBe("compact");
    expect(densityFromWidth(1024)).toBe("dense");
  });
});

describe("getShipDetailLabels", () => {
  it("abbreviates constrained labels at comfortable density", () => {
    const labels = getShipDetailLabels("comfortable");
    expect(labels.bridgeTitle).toBe("BOffs & Consoles");
    expect(labels.weaponsTitle).toBe("Hardpoints");
    expect(labels.engineering).toBe("Eng");
    expect(labels.weapons).toBe("Wpn");
  });

  it("uses single-letter career labels at dense density", () => {
    const labels = getShipDetailLabels("dense");
    expect(labels.engineering).toBe("E");
    expect(labels.tactical).toBe("T");
    expect(labels.science).toBe("S");
    expect(labels.weapons).toBe("W");
  });

  it("keeps full names available for tooltips", () => {
    expect(SHIP_DETAIL_FULL_LABELS.bridgeTitle).toBe(
      "Bridge Officers and Consoles",
    );
    expect(SHIP_DETAIL_FULL_LABELS.engineering).toBe("Engineering");
  });
});
