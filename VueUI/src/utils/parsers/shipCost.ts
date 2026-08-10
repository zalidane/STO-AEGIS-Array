export interface ShipCost {
  amount: string;
  currencyCode: string;
  label: string;
  color: string;
}

const currencyInfo: Record<
  string,
  {
    label: string;
    color: string;
  }
> = {
  dil: {
    label: "Refined Dilithium",
    color: "#7e57c2",
  },

  Zen: {
    label: "Zen",
    color: "#d4af37",
  },

  FC: {
    label: "Fleet Credit",
    color: "#ffffff",
  },

  FSM: {
    label: "Fleet Ship Module",
    color: "#ffffff",
  },

  LB: {
    label: "Lock Box",
    color: "#c0c0c0",
  },

  "R&D": {
    label: "Research & Development Pack",
    color: "#1976d2",
  },

  PPP5: {
    label: "Epic Phoenix Prize Pack Token",
    color: "#e53935",
  },

  SRFED5: {
    label: "Tier 5 Starship Requisition (Federation)",
    color: "#ffffff",
  },
  SRFED4: {
    label: "Tier 4 Starship Requisition (Federation)",
    color: "#ffffff",
  },
  SRFED3: {
    label: "Tier 3 Starship Requisition (Federation)",
    color: "#ffffff",
  },
  SRFED2: {
    label: "Tier 2 Starship Requisition (Federation)",
    color: "#ffffff",
  },

  SRROM5: {
    label: "Tier 5 Starship Requisition (Romulan)",
    color: "#ffffff",
  },
  SRROM4: {
    label: "Tier 4 Starship Requisition (Romulan)",
    color: "#ffffff",
  },
  SRROM3: {
    label: "Tier 3 Starship Requisition (Romulan)",
    color: "#ffffff",
  },
  SRROM2: {
    label: "Tier 2 Starship Requisition (Romulan)",
    color: "#ffffff",
  },

  SRKDF5: {
    label: "Tier 5 Starship Requisition (KDF)",
    color: "#ffffff",
  },
  SRKDF4: {
    label: "Tier 4 Starship Requisition (KDF)",
    color: "#ffffff",
  },
  SRKDF3: {
    label: "Tier 3 Starship Requisition (KDF)",
    color: "#ffffff",
  },
  SRKDF2: {
    label: "Tier 2 Starship Requisition (KDF)",
    color: "#ffffff",
  },
};

export function parseShipCost(cost: string | null | undefined): ShipCost[] {
  if (!cost) {
    return [];
  }

  return cost
    .split("/")
    .map((part) => {
      const [amount, currencyCode] = part.trim().split(";");

      if (!amount || !currencyCode) {
        return null;
      }

      const info = currencyInfo[currencyCode] ?? {
        label: currencyCode,
        color: "#ffffff",
      };

      return {
        amount,
        currencyCode,
        label: info.label,
        color: info.color,
      };
    })
    .filter((x): x is ShipCost => x !== null);
}

export const costNames: Record<string, string> = {
  dil: "Refined Dilithium",
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
  SRKDF4: "Tier 4 Starship Requisition (KDF)",
  SRKDF3: "Tier 3 Starship Requisition (KDF)",
  SRKDF2: "Tier 2 Starship Requisition (KDF)",
};

export const currencyColors: Record<string, string> = {
  "Refined Dilithium": "#7e57c2",
  Zen: "#d4af37",
  SR: "#ffffff",
  FSM: "#FFFFFF",
  LB: "#c0c0c0",
  PPP5: "#e53935",
  "R&D": "#1976d2",
};
