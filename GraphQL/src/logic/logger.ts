export type LogLevel = "info" | "error" | "warn";

export type LogFields = Record<string, unknown>;

export type Logger = {
  info: (fields: LogFields) => void;
  warn: (fields: LogFields) => void;
  error: (fields: LogFields) => void;
};

function writeLine(level: LogLevel, fields: LogFields): void {
  const line = JSON.stringify({
    level,
    time: new Date().toISOString(),
    ...fields,
  });
  if (level === "error") {
    console.error(line);
    return;
  }
  if (level === "warn") {
    console.warn(line);
    return;
  }
  console.log(line);
}

/** Structured JSON logger (Railway-friendly single-line JSON). */
export const logger: Logger = {
  info: (fields) => writeLine("info", fields),
  warn: (fields) => writeLine("warn", fields),
  error: (fields) => writeLine("error", fields),
};

export function formatErrorFields(
  err: unknown,
  extras: LogFields = {},
): LogFields {
  if (err instanceof Error) {
    return {
      ...extras,
      message: err.message,
      stack: err.stack,
      name: err.name,
    };
  }
  return {
    ...extras,
    message: String(err),
  };
}
