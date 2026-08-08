import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  decodeHtmlEntities,
  deepDecodeHtmlEntities,
} from "./decodeHtmlEntities.js";

describe("decodeHtmlEntities", () => {
  it("decodes numeric apostrophe entities (Mat&#039;Ha)", () => {
    assert.equal(decodeHtmlEntities("Mat&#039;Ha"), "Mat'Ha");
  });

  it("decodes hex entities", () => {
    assert.equal(decodeHtmlEntities("Mat&#x27;Ha"), "Mat'Ha");
  });

  it("decodes common named entities", () => {
    assert.equal(
      decodeHtmlEntities("&quot;test&quot; &amp; &lt;tag&gt;"),
      '"test" & <tag>',
    );
  });

  it("decodes double-encoded entities", () => {
    assert.equal(decodeHtmlEntities("Mat&amp;#039;Ha"), "Mat'Ha");
  });

  it("leaves unknown named entities untouched", () => {
    assert.equal(decodeHtmlEntities("&notarealentity;"), "&notarealentity;");
  });
});

describe("deepDecodeHtmlEntities", () => {
  it("decodes nested strings in objects and arrays", () => {
    const input = {
      name: "Mat&#039;Ha",
      tags: ["&quot;alpha&quot;", "plain"],
      nested: { short: "it&apos;s close" },
      count: 3,
      when: null,
    };

    assert.deepEqual(deepDecodeHtmlEntities(input), {
      name: "Mat'Ha",
      tags: ['"alpha"', "plain"],
      nested: { short: "it's close" },
      count: 3,
      when: null,
    });
  });

  it("preserves Date instances", () => {
    const when = new Date("2024-01-01T00:00:00.000Z");
    const result = deepDecodeHtmlEntities({ when });
    assert.ok(result.when instanceof Date);
    assert.equal(result.when.toISOString(), when.toISOString());
  });
});
