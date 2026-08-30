export type ShareVisibility = "unlisted" | "public";

export type LocalShareRecord = {
  loadoutId: string;
  publicCode: string;
  editToken: string;
  visibility: ShareVisibility;
  updatedAt: string;
};

export function upsertShareRecord(
  records: readonly LocalShareRecord[],
  next: LocalShareRecord,
): LocalShareRecord[] {
  const without = records.filter(
    (row) =>
      row.loadoutId !== next.loadoutId && row.publicCode !== next.publicCode,
  );
  return [...without, next];
}

export function recordForLoadout(
  records: readonly LocalShareRecord[],
  loadoutId: string,
): LocalShareRecord | null {
  return records.find((row) => row.loadoutId === loadoutId) ?? null;
}

export function recordForCode(
  records: readonly LocalShareRecord[],
  publicCode: string,
): LocalShareRecord | null {
  return records.find((row) => row.publicCode === publicCode) ?? null;
}

export function dropShareRecord(
  records: readonly LocalShareRecord[],
  loadoutId: string,
): LocalShareRecord[] {
  return records.filter((row) => row.loadoutId !== loadoutId);
}

export function sharedBuildUrl(publicCode: string, origin?: string): string {
  const path = `/b/${publicCode}`;
  if (!origin) return path;
  return `${origin.replace(/\/$/, "")}${path}`;
}

function isRecord(value: unknown): value is LocalShareRecord {
  if (!value || typeof value !== "object") return false;
  const row = value as LocalShareRecord;
  return (
    typeof row.loadoutId === "string" &&
    typeof row.publicCode === "string" &&
    typeof row.editToken === "string" &&
    (row.visibility === "unlisted" || row.visibility === "public") &&
    typeof row.updatedAt === "string"
  );
}

export function hydrateShareRecords(raw: unknown): LocalShareRecord[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(isRecord);
}
