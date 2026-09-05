const EQUIP_ERROR: Record<string, string> = {
  "no-character": "Create a captain first.",
  "unknown-loadout": "That loadout is missing.",
  "unknown-slot": "That slot is not on this hull.",
  "unknown-item": "That item is not in the catalog.",
  "not-owned": "Collect this item before seating it.",
  "illegal-slot": "That item does not fit this slot.",
  "equip-limit": "This unique item is already seated.",
  "locked-slot": "That slot is locked.",
};

export function equipMessage(reason: string): string {
  return EQUIP_ERROR[reason] ?? reason;
}
