import assert from "node:assert/strict";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { describe, it } from "node:test";
import {
  CORRELATION_ID_HEADER,
  REQUEST_ID_HEADER,
  isUuidIsh,
  resolveCorrelationId,
} from "./correlationId.js";
import type { LogFields, Logger } from "./logger.js";
import {
  attachOperationName,
  withRequestLogging,
} from "./requestLogging.js";

function createCapturingLogger() {
  const lines: LogFields[] = [];
  const log: Logger = {
    info: (fields) => lines.push({ level: "info", ...fields }),
    warn: (fields) => lines.push({ level: "warn", ...fields }),
    error: (fields) => lines.push({ level: "error", ...fields }),
  };
  return { log, lines };
}

async function withTestServer(
  handler: (req: IncomingMessage, res: ServerResponse) => void,
  run: (baseUrl: string) => Promise<void>,
): Promise<void> {
  const server = createServer(handler);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert.ok(address && typeof address === "object");
  const baseUrl = `http://127.0.0.1:${address.port}`;
  try {
    await run(baseUrl);
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  }
}

describe("correlationId", () => {
  it("accepts UUID-ish values and rejects junk", () => {
    assert.equal(isUuidIsh("550e8400-e29b-41d4-a716-446655440000"), true);
    assert.equal(isUuidIsh("not-a-uuid"), false);
    assert.equal(isUuidIsh("550e8400e29b41d4a716446655440000"), false);
  });

  it("reuses x-correlation-id when valid", () => {
    const id = "550e8400-e29b-41d4-a716-446655440000";
    assert.equal(
      resolveCorrelationId({ [CORRELATION_ID_HEADER]: id }),
      id,
    );
  });

  it("falls back to x-request-id when correlation missing", () => {
    const id = "550e8400-e29b-41d4-a716-446655440001";
    assert.equal(resolveCorrelationId({ [REQUEST_ID_HEADER]: id }), id);
  });

  it("mints a UUID when headers are absent or invalid", () => {
    const minted = resolveCorrelationId({
      [CORRELATION_ID_HEADER]: "nope",
      [REQUEST_ID_HEADER]: "also-nope",
    });
    assert.equal(isUuidIsh(minted), true);
  });
});

describe("withRequestLogging", () => {
  it("sets x-correlation-id and echoes x-request-id on the response", async () => {
    const { log, lines } = createCapturingLogger();
    const provided = "11111111-2222-4333-a444-555555555555";

    await withTestServer(
      withRequestLogging(
        (_req, res) => {
          res.statusCode = 200;
          res.end("ok");
        },
        { log, now: () => 1_000 },
      ),
      async (baseUrl) => {
        const response = await fetch(`${baseUrl}/graphql`, {
          headers: { [CORRELATION_ID_HEADER]: provided },
        });
        assert.equal(response.status, 200);
        assert.equal(response.headers.get(CORRELATION_ID_HEADER), provided);
        assert.equal(response.headers.get(REQUEST_ID_HEADER), provided);
      },
    );

    assert.equal(lines.length, 1);
    assert.equal(lines[0]?.msg, "request");
    assert.equal(lines[0]?.correlation_id, provided);
    assert.equal(lines[0]?.method, "GET");
    assert.equal(lines[0]?.path, "/graphql");
    assert.equal(lines[0]?.status, 200);
  });

  it("mints a correlation id when none is provided", async () => {
    const { log, lines } = createCapturingLogger();

    await withTestServer(
      withRequestLogging(
        (_req, res) => {
          res.statusCode = 204;
          res.end();
        },
        { log },
      ),
      async (baseUrl) => {
        const response = await fetch(`${baseUrl}/health`);
        const headerId = response.headers.get(CORRELATION_ID_HEADER);
        assert.ok(headerId);
        assert.equal(isUuidIsh(headerId), true);
        assert.equal(lines[0]?.correlation_id, headerId);
      },
    );
  });

  it("includes operationName on the access log without variables", async () => {
    const { log, lines } = createCapturingLogger();

    await withTestServer(
      withRequestLogging(
        (_req, res) => {
          attachOperationName(res, "Ships");
          res.statusCode = 200;
          res.end(
            JSON.stringify({
              // Deliberately include a variables-shaped payload in the body;
              // the access logger must never surface it.
              data: { ships: [] },
              variables: { secretCaptain: "should-not-log" },
            }),
          );
        },
        { log },
      ),
      async (baseUrl) => {
        await fetch(`${baseUrl}/graphql`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            query: "query Ships { ships { id } }",
            operationName: "Ships",
            variables: { secretCaptain: "should-not-log", auth: "Bearer xyz" },
          }),
        });
      },
    );

    assert.equal(lines.length, 1);
    const serialized = JSON.stringify(lines[0]);
    assert.equal(lines[0]?.operationName, "Ships");
    assert.equal(serialized.includes("secretCaptain"), false);
    assert.equal(serialized.includes("Bearer"), false);
    assert.equal(serialized.includes("variables"), false);
    assert.equal(serialized.includes("Authorization"), false);
  });

  it("logs errors with the same correlation_id and no request body", async () => {
    const { log, lines } = createCapturingLogger();
    const provided = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";

    await withTestServer(
      withRequestLogging(
        () => {
          throw new Error("boom-test");
        },
        { log },
      ),
      async (baseUrl) => {
        const response = await fetch(`${baseUrl}/graphql`, {
          method: "POST",
          headers: {
            [CORRELATION_ID_HEADER]: provided,
            "content-type": "application/json",
            authorization: "Bearer super-secret",
          },
          body: JSON.stringify({
            variables: { password: "hunter2" },
          }),
        });
        assert.equal(response.status, 500);
        assert.equal(response.headers.get(CORRELATION_ID_HEADER), provided);
      },
    );

    const errorLine = lines.find((line) => line.msg === "request_error");
    assert.ok(errorLine);
    assert.equal(errorLine.correlation_id, provided);
    assert.equal(errorLine.message, "boom-test");
    assert.match(String(errorLine.stack), /boom-test/);
    const serialized = JSON.stringify(lines);
    assert.equal(serialized.includes("hunter2"), false);
    assert.equal(serialized.includes("super-secret"), false);
    assert.equal(serialized.includes("password"), false);
  });
});
