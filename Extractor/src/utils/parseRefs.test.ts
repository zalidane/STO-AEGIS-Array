import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { extractWikiTargets } from "./parseRefs";
import { decodeHtmlEntities } from "./decodeHtmlEntities";

describe("extractWikiTargets + HTML-encoded ship names", () => {
  it("links Overwhelming Force obtained text to Mat'Ha Raptor", () => {
    const obtained =
      '*&lt;span title=&quot;Klingon only&quot;&gt;[[File:Faction Klingon.png|16px|link=Klingon-only]]&lt;/span&gt; [[Mat&#039;Ha Raptor]]';

    const targets = extractWikiTargets(obtained);
    assert.ok(targets.includes("Mat'Ha Raptor"));

    const shipNameFromDb = "Mat&#039;Ha Raptor";
    const shipByName = new Map([
      [decodeHtmlEntities(shipNameFromDb), 42],
    ]);

    assert.equal(shipByName.get("Mat'Ha Raptor"), 42);
  });

  it("ignores File: wiki targets", () => {
    const targets = extractWikiTargets(
      "[[File:Faction Klingon.png|16px]] [[Mat&#039;Ha Raptor]]",
    );
    assert.deepEqual(targets, ["Mat'Ha Raptor"]);
  });
});
