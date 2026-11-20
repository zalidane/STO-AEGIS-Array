/**
 * Canonical Cargo `Traits.type` for UI filtering and labels.
 *
 * A few wiki trait pages set `type` to a free-text label instead of the
 * Cargo code `char`, e.g. Astrophysicist ("Race (Space)"), Anchored
 * ("Lock box (Space)"), and Conduit ("Lockbox (Ground)"). Those are personal
 * captain traits, so treat them as `char`. Unknown types pass through
 * lowercased.
 */
const PERSONAL_TYPE_ALIAS = /^(?:race|species|lock\s*box|personal)\b/i;

export function normalizeTraitType(
  type: string | null | undefined,
): string | null {
  const trimmed = type?.trim();
  if (!trimmed) return null;
  if (PERSONAL_TYPE_ALIAS.test(trimmed)) return "char";
  return trimmed.toLowerCase();
}
