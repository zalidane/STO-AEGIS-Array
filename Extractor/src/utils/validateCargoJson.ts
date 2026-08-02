export type JsonValidationResult =
  | { ok: true; rows: Record<string, unknown>[] }
  | { ok: false; error: string };

/** Verifies cargo table JSON: must parse as an array of plain objects. */
export function validateCargoJson(
  raw: string,
  context: string,
): JsonValidationResult {
  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[JSON] ${context}: parse failed — ${message}`);
    return { ok: false, error: message };
  }

  return validateCargoRows(parsed, context);
}

export function validateCargoRows(
  data: unknown,
  context: string,
): JsonValidationResult {
  if (!Array.isArray(data)) {
    const error = `expected a JSON array, got ${describeType(data)}`;
    console.error(`[JSON] ${context}: ${error}`);
    return { ok: false, error };
  }

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    if (row === null || typeof row !== "object" || Array.isArray(row)) {
      const error = `row ${i} is not an object (${describeType(row)})`;
      console.error(`[JSON] ${context}: ${error}`);
      return { ok: false, error };
    }
  }

  return { ok: true, rows: data as Record<string, unknown>[] };
}

function describeType(value: unknown): string {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value;
}
