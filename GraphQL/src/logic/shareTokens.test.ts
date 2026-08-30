import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  generateEditToken,
  generatePublicCode,
  hashEditToken,
  PUBLIC_CODE_LENGTH,
  publicCodeUrlPath,
  verifyEditToken,
} from "./shareTokens.js";

describe("share tokens", () => {
  it("mints an 8-character unlisted publicCode", () => {
    const bytes = Uint8Array.from({ length: 8 }, (_, i) => i + 3);
    const code = generatePublicCode(() => bytes);
    assert.equal(code.length, PUBLIC_CODE_LENGTH);
    assert.match(code, /^[23456789abcdefghjkmnpqrstuvwxyz]+$/);
    assert.equal(publicCodeUrlPath(code), `/b/${code}`);
  });

  it("hashes the edit token and verifies with a timing-safe compare", () => {
    const token = generateEditToken(() => Uint8Array.from({ length: 18 }, (_, i) => i + 1));
    const hash = hashEditToken(token);
    assert.equal(verifyEditToken(token, hash), true);
    assert.equal(verifyEditToken("nope", hash), false);
  });
});
