/**
 * Resolve a ship display name by prefixing `displayClass` when it is not
 * already present in the stored `name` (DB name is left unchanged).
 *
 * Example: name "Advanced Heavy Cruiser (T6)" + class "Resolute"
 * → "Resolute Advanced Heavy Cruiser (T6)"
 */
export function formatShipResolvedName(
  name: string,
  displayClass: string | null | undefined,
): string {
  const klass = displayClass?.trim();
  if (!klass) return name;

  if (nameIncludesDisplayClass(name, klass)) return name;

  return `${klass} ${name}`;
}

function nameIncludesDisplayClass(name: string, displayClass: string): boolean {
  const escaped = displayClass.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?:^|\\s)${escaped}(?:\\s|$)`, "i").test(name);
}
