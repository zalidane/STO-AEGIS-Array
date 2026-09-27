import { randomUUID } from "node:crypto";
import type { IncomingHttpHeaders } from "node:http";

export const CORRELATION_ID_HEADER = "x-correlation-id";
export const REQUEST_ID_HEADER = "x-request-id";

/** RFC 4122 UUID (any version) — ops correlation, not cryptographic auth. */
const UUID_ISH =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuidIsh(value: string): boolean {
  return UUID_ISH.test(value.trim());
}

function firstHeaderValue(
  value: string | string[] | undefined,
): string | undefined {
  if (typeof value === "string") return value.trim() || undefined;
  if (Array.isArray(value)) {
    for (const entry of value) {
      const trimmed = entry.trim();
      if (trimmed) return trimmed;
    }
  }
  return undefined;
}

/**
 * Prefer incoming x-correlation-id, then x-request-id, when UUID-ish;
 * otherwise mint a UUID v4. Never trusts arbitrary non-UUID strings.
 */
export function resolveCorrelationId(headers: IncomingHttpHeaders): string {
  const candidates = [
    firstHeaderValue(headers[CORRELATION_ID_HEADER]),
    firstHeaderValue(headers[REQUEST_ID_HEADER]),
  ];
  for (const candidate of candidates) {
    if (candidate && isUuidIsh(candidate)) return candidate;
  }
  return randomUUID();
}
