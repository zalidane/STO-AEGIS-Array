import { parseShipCost, type ShipCost } from "@/utils/parsers/shipCost";

/** Wiki cost codes that default to character-bound with an Event reclaim (account) choice. */
export const ACCOUNT_UNLOCK_CURRENCIES = new Set(["app", "ppp5", "ppps"]);

/** Zen Store prices above this can be a single-captain unlock. */
export const EXPENSIVE_ZEN_THRESHOLD = 10000;

const BIND_CHOICE_CLOSER =
  "Mark this copy as unlocked for the account, or bound to this captain.";

export type BindChoiceHull = {
  cost?: string | null;
  displayPrefix?: string | null;
  name?: string | null;
};

export type BindChoiceSnapshot = {
  parts: ShipCost[];
  codes: string[];
  legendary: boolean;
};

export type BindChoiceCondition = {
  id: string;
  /** Shown in the collect dialog when this condition matches. */
  prompt: string;
  matches: (cost: BindChoiceSnapshot) => boolean;
};

export type BindChoice = {
  requiresChoice: boolean;
  prompt: string;
  conditionIds: string[];
};

export type BindChoiceInput = string | BindChoiceHull | null | undefined;

export function isLegendaryHull(hull: {
  displayPrefix?: string | null;
  name?: string | null;
}): boolean {
  if (hull.displayPrefix?.trim().toLowerCase() === "legendary") return true;
  return /^\s*legendary\b/i.test(hull.name ?? "");
}

function toHull(input: BindChoiceInput): BindChoiceHull {
  if (input == null) return {};
  if (typeof input === "string") return { cost: input };
  return input;
}

function snapshotFromHull(hull: BindChoiceHull): BindChoiceSnapshot {
  const parts = parseShipCost(hull.cost);
  return {
    parts,
    codes: parts.map((part) => part.currencyCode.toLowerCase()),
    legendary: isLegendaryHull(hull),
  };
}

function numericAmount(amount: string): number {
  return Number.parseFloat(amount.replace(/,/g, ""));
}

function isZenCode(code: string): boolean {
  return code.toLowerCase() === "zen";
}

/**
 * Append a new object here when another acquisition path should offer
 * account vs single-captain bind. `allowsAccountUnlockFromCost` and the
 * collect dialog both follow this list.
 */
export const SHIP_BIND_CHOICE_CONDITIONS: BindChoiceCondition[] = [
  {
    id: "phoenix-anniversary",
    prompt:
      "Phoenix Token and Anniversary Prize Pack ships were originally account unlocks. Choose account if you reclaimed this copy from Events.",
    matches: ({ codes }) =>
      codes.some((code) => ACCOUNT_UNLOCK_CURRENCIES.has(code)),
  },
  {
    id: "non-zen-path",
    prompt:
      "This hull is also obtained by a method other than the Zen Store, which can bind it to a single captain.",
    matches: ({ codes }) =>
      codes.includes("zen") && codes.some((code) => code !== "zen"),
  },
  {
    id: "expensive-zen",
    prompt:
      "A Zen Store price over 10,000 can be a single-captain unlock instead of an account unlock.",
    matches: ({ parts, legendary }) =>
      !legendary &&
      parts.some(
        (part) =>
          isZenCode(part.currencyCode) &&
          numericAmount(part.amount) > EXPENSIVE_ZEN_THRESHOLD,
      ),
  },
];

export function matchingBindChoiceConditions(
  input: BindChoiceInput,
): BindChoiceCondition[] {
  const snapshot = snapshotFromHull(toHull(input));
  return SHIP_BIND_CHOICE_CONDITIONS.filter((condition) =>
    condition.matches(snapshot),
  );
}

export function matchingBindChoiceConditionsFromCosts(
  inputs: BindChoiceInput[],
): BindChoiceCondition[] {
  const matchedIds = new Set<string>();
  for (const input of inputs) {
    for (const condition of matchingBindChoiceConditions(input)) {
      matchedIds.add(condition.id);
    }
  }
  return SHIP_BIND_CHOICE_CONDITIONS.filter((condition) =>
    matchedIds.has(condition.id),
  );
}

function composePrompt(matched: BindChoiceCondition[]): string {
  if (matched.length === 0) return "";
  return `${matched.map((condition) => condition.prompt).join(" ")} ${BIND_CHOICE_CLOSER}`;
}

function toBindChoice(matched: BindChoiceCondition[]): BindChoice {
  return {
    requiresChoice: matched.length > 0,
    prompt: composePrompt(matched),
    conditionIds: matched.map((condition) => condition.id),
  };
}

export function bindChoiceFromCost(
  cost: string | null | undefined,
  hull?: Omit<BindChoiceHull, "cost">,
): BindChoice {
  return toBindChoice(matchingBindChoiceConditions({ cost, ...hull }));
}

export function bindChoiceFromHull(hull: BindChoiceHull): BindChoice {
  return toBindChoice(matchingBindChoiceConditions(hull));
}

export function bindChoiceFromGrantingShips(
  inputs: BindChoiceInput[],
): BindChoice {
  return toBindChoice(matchingBindChoiceConditionsFromCosts(inputs));
}

export const FALLBACK_BIND_CHOICE_PROMPT = composePrompt(
  SHIP_BIND_CHOICE_CONDITIONS,
);
