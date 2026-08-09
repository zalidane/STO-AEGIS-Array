import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatShipResolvedName } from "./formatShipResolvedName.js";

describe("formatShipResolvedName", () => {
  it("prefixes Resolute onto Advanced Heavy Cruiser (T6)", () => {
    assert.equal(
      formatShipResolvedName("Advanced Heavy Cruiser (T6)", "Resolute"),
      "Resolute Advanced Heavy Cruiser (T6)",
    );
  });

  it("returns name when displayClass is missing", () => {
    assert.equal(
      formatShipResolvedName("Advanced Heavy Cruiser (T6)", null),
      "Advanced Heavy Cruiser (T6)",
    );
  });

  it("does not double-prefix when class is already in the name", () => {
    assert.equal(
      formatShipResolvedName(
        "Daystrom Class Miracle Worker Cruiser",
        "Daystrom",
      ),
      "Daystrom Class Miracle Worker Cruiser",
    );
    assert.equal(
      formatShipResolvedName(
        "Legendary Excelsior Miracle Worker Heavy Cruiser",
        "Excelsior",
      ),
      "Legendary Excelsior Miracle Worker Heavy Cruiser",
    );
  });
});
