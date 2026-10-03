export type LoadoutPresenceAction = "create" | "select" | "hold";

export type LoadoutPresenceDecision = {
  action: LoadoutPresenceAction;
  selectedId: string | null;
};

/**
 * The builder mints a blank loadout when a captain opens a hull that has none.
 * After they delete the last loadout, that mint must not run again or Delete
 * looks like it did nothing.
 */
export function decideLoadoutPresence(input: {
  hasShip: boolean;
  hasCharacter: boolean;
  loadoutIds: readonly string[];
  selectedId: string | null;
  suppressCreate: boolean;
}): LoadoutPresenceDecision {
  if (!input.hasShip || !input.hasCharacter) {
    return { action: "hold", selectedId: input.selectedId };
  }
  if (input.loadoutIds.length === 0) {
    if (input.suppressCreate) return { action: "hold", selectedId: null };
    return { action: "create", selectedId: null };
  }
  if (
    input.selectedId == null ||
    !input.loadoutIds.includes(input.selectedId)
  ) {
    return { action: "select", selectedId: input.loadoutIds[0] ?? null };
  }
  return { action: "hold", selectedId: input.selectedId };
}

export function loadoutsAfterDeleteChoice(
  loadoutIds: readonly string[],
  deletedId: string,
): { selectedId: string | null; suppressCreate: boolean } {
  const remainingIds = loadoutIds.filter((id) => id !== deletedId);
  if (remainingIds.length === 0) {
    return { selectedId: null, suppressCreate: true };
  }
  return { selectedId: remainingIds[0] ?? null, suppressCreate: false };
}

export function deleteLoadoutConfirmText(name: string): string {
  return `Are you sure you want to delete the loadout ${name}?`;
}
