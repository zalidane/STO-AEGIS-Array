import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import { alignLocalImageFile, readImageDirIndex } from "./localImageFiles";

describe("alignLocalImageFile", () => {
  it("renames apostrophe and case-only files onto the canonical public name", async () => {
    const dir = await mkdtemp(join(tmpdir(), "sto-images-"));
    try {
      await writeFile(join(dir, "Amarie_Smuggler's_Heavy_Escort.jpg"), "a");
      await writeFile(join(dir, "Obeliskcarrier.jpg"), "b");

      const index = await readImageDirIndex(dir);
      const apostrophe = await alignLocalImageFile(
        dir,
        "Amarie_Smugglers_Heavy_Escort.jpg",
        index,
      );
      const casing = await alignLocalImageFile(dir, "obeliskcarrier.jpg", index);

      assert.equal(apostrophe.renamedFrom, "Amarie_Smuggler's_Heavy_Escort.jpg");
      assert.equal(casing.renamedFrom, "Obeliskcarrier.jpg");
      const names = await readdir(dir);
      assert.deepEqual(names.sort(), [
        "Amarie_Smugglers_Heavy_Escort.jpg",
        "obeliskcarrier.jpg",
      ]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("leaves an already-canonical file in place", async () => {
    const dir = await mkdtemp(join(tmpdir(), "sto-images-"));
    try {
      await mkdir(dir, { recursive: true });
      await writeFile(join(dir, "Fed_Ship_Achilles.png"), "ok");
      const index = await readImageDirIndex(dir);
      const result = await alignLocalImageFile(dir, "Fed_Ship_Achilles.png", index);
      assert.equal(result.renamedFrom, null);
      assert.equal(result.bytes, 2);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
