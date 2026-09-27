import { describe, expect, it } from "vitest";
import {
  getLastCorrelationId,
  rememberCorrelationIdFromResponse,
} from "@/logic/ops/correlationId";

describe("correlationId (ops)", () => {
  it("remembers x-correlation-id from a Response", () => {
    const id = "550e8400-e29b-41d4-a716-446655440000";
    rememberCorrelationIdFromResponse(
      new Response(null, {
        headers: { "x-correlation-id": id },
      }),
    );
    expect(getLastCorrelationId()).toBe(id);
  });

  it("falls back to x-request-id", () => {
    const id = "550e8400-e29b-41d4-a716-446655440099";
    rememberCorrelationIdFromResponse(
      new Response(null, {
        headers: { "x-request-id": id },
      }),
    );
    expect(getLastCorrelationId()).toBe(id);
  });
});
