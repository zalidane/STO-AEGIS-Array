export interface ShipCost {
  amount: string;
  currency: string;
}

export function parseShipCost(cost: string | null | undefined): ShipCost[] {
  if (!cost) {
    return [];
  }

  return cost
    .split("/")
    .map((part) => {
      const [amount, currency] = part.trim().split(";");

      if (!amount || !currency) {
        return null;
      }

      return {
        amount,
        currency,
      };
    })
    .filter((item): item is ShipCost => item !== null);
}

export const costNames: Record<string, string> = {
  Dil: "Refined Dilithium",
  Zen: "Zen",
  FC: "Fleet Credit",
  FSM: "Fleet Ship Module",
  Veteran: "Days of Veteran Status",
  "R&D": "Research & Development Pack",
  LC: "Lobi Crystal",
  LB: "Lock Box",
  PPPS: "Epic Phoenix Prize Pack Token",
  SRFED5: "Tier 5 Starship Requisition (Federation)",
  SRFED4: "Tier 4 Starship Requisition (Federation)",
  SRFED3: "Tier 3 Starship Requisition (Federation)",
  SRFED2: "Tier 2 Starship Requisition (Federation)",

  SRROM5: "Tier 5 Starship Requisition (Romulan)",
  SRROM4: "Tier 4 Starship Requisition (Romulan)",
  SRROM3: "Tier 3 Starship Requisition (Romulan)",
  SRROM2: "Tier 2 Starship Requisition (Romulan)",

  SRKDF5: "Tier 5 Starship Requisition (KDF)",
  SRKDF4: "Tier 3 Starship Requisition (KDF)",
  SRKDF3: "Tier 3 Starship Requisition (KDF)",
  SRKDF2: "Tier 2 Starship Requisition (KDF)",
};
