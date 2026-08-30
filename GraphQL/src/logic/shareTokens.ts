import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

const PUBLIC_CODE_ALPHABET = "23456789abcdefghjkmnpqrstuvwxyz";
export const PUBLIC_CODE_LENGTH = 8;
export const EDIT_TOKEN_BYTES = 18;

export function generatePublicCode(
  random: () => Uint8Array = () => randomBytes(PUBLIC_CODE_LENGTH),
): string {
  const bytes = random();
  let code = "";
  for (let i = 0; i < PUBLIC_CODE_LENGTH; i += 1) {
    const byte = bytes[i] ?? 0;
    code += PUBLIC_CODE_ALPHABET[byte % PUBLIC_CODE_ALPHABET.length];
  }
  return code;
}

export function generateEditToken(
  random: () => Uint8Array = () => randomBytes(EDIT_TOKEN_BYTES),
): string {
  return Buffer.from(random()).toString("base64url");
}

export function hashEditToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function verifyEditToken(token: string, expectedHash: string): boolean {
  const actual = hashEditToken(token);
  if (actual.length !== expectedHash.length) return false;
  return timingSafeEqual(Buffer.from(actual), Buffer.from(expectedHash));
}

export function hashClientIp(ip: string | null | undefined): string | null {
  const trimmed = ip?.trim();
  if (!trimmed) return null;
  return createHash("sha256").update(`list-ip:${trimmed}`).digest("hex");
}

export function publicCodeUrlPath(code: string): string {
  return `/b/${code}`;
}
