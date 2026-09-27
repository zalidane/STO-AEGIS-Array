import type { IncomingMessage, ServerResponse } from "node:http";
import {
  CORRELATION_ID_HEADER,
  REQUEST_ID_HEADER,
  resolveCorrelationId,
} from "./correlationId.js";
import { formatErrorFields, type Logger, logger as defaultLogger } from "./logger.js";

const OPERATION_NAME_KEY = "__aegisOperationName";

type ResponseWithMeta = ServerResponse & {
  [OPERATION_NAME_KEY]?: string;
};

export type AccessLogFields = {
  msg: "request";
  method: string;
  path: string;
  status: number;
  duration_ms: number;
  correlation_id: string;
  operationName?: string;
};

export type RequestLoggingOptions = {
  log?: Logger;
  /** Override clock for tests (ms). */
  now?: () => number;
};

function requestPath(url: string | undefined): string {
  if (!url) return "/";
  const q = url.indexOf("?");
  return q === -1 ? url : url.slice(0, q);
}

/** Attach GraphQL operationName to the Node response for the access log (no variables). */
export function attachOperationName(
  res: ServerResponse,
  operationName: string | null | undefined,
): void {
  if (!operationName) return;
  (res as ResponseWithMeta)[OPERATION_NAME_KEY] = operationName;
}

/**
 * Wrap a Node HTTP handler with correlation ids + structured access/error logs.
 * Never logs bodies, GraphQL variables, or Authorization headers.
 */
export function withRequestLogging(
  handler: (
    req: IncomingMessage,
    res: ServerResponse,
  ) => void | Promise<void>,
  options: RequestLoggingOptions = {},
): (req: IncomingMessage, res: ServerResponse) => void {
  const log = options.log ?? defaultLogger;
  const now = options.now ?? Date.now;

  return (req, res) => {
    const correlationId = resolveCorrelationId(req.headers);
    const started = now();
    const method = req.method ?? "GET";
    const path = requestPath(req.url);

    res.setHeader(CORRELATION_ID_HEADER, correlationId);
    res.setHeader(REQUEST_ID_HEADER, correlationId);

    let finished = false;
    const writeAccessLog = () => {
      if (finished) return;
      finished = true;
      const fields: AccessLogFields = {
        msg: "request",
        method,
        path,
        status: res.statusCode,
        duration_ms: Math.max(0, Math.round(now() - started)),
        correlation_id: correlationId,
      };
      const operationName = (res as ResponseWithMeta)[OPERATION_NAME_KEY];
      if (operationName) fields.operationName = operationName;
      log.info(fields);
    };

    res.on("finish", writeAccessLog);
    res.on("close", writeAccessLog);

    const onUnhandled = (err: unknown) => {
      log.error(
        formatErrorFields(err, {
          msg: "request_error",
          method,
          path,
          correlation_id: correlationId,
        }),
      );
      if (!res.headersSent) {
        res.statusCode = 500;
        res.setHeader(CORRELATION_ID_HEADER, correlationId);
        res.setHeader(REQUEST_ID_HEADER, correlationId);
        res.end("Internal Server Error");
      }
    };

    try {
      const result = handler(req, res);
      if (result && typeof (result as Promise<void>).then === "function") {
        void (result as Promise<void>).catch(onUnhandled);
      }
    } catch (err) {
      onUnhandled(err);
    }
  };
}

/**
 * Yoga plugin: copy operationName onto the Node ServerResponse for access logs.
 * Does not read or log GraphQL variables.
 */
export function createOperationNamePlugin() {
  return {
    onParams({
      params,
      serverContext,
    }: {
      params: { operationName?: string | null };
      serverContext?: { res?: ServerResponse };
    }) {
      const res = serverContext?.res;
      if (res) attachOperationName(res, params.operationName);
    },
  };
}
