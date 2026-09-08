import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  join(
    dirname(fileURLToPath(import.meta.url)),
    "../components/collection/CaptainIdentityFields.vue",
  ),
  "utf8",
);

describe("CaptainIdentityFields overlay contract", () => {
  it("does not attach select menus into the parent dialog", () => {
    expect(source).not.toMatch(/attach:\s*true/);
    expect(source).not.toMatch(/:menu-props/);
  });
});
