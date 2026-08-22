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

  PPPS: {
    label: "Epic Phoenix Prize Pack Token",
    color: "#e53935",
  },

  APP: {
    label: "Anniversary Prize Pack",
    color: "#f9a825",
  },

  LC: {
    label: "Lobi Crystal",
    color: "#26c6da",
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

function decodeCostText(value: string): string {
  return value.replace(/&amp;/gi, "&");
}

export function shipCostCurrencyCodes(
  cost: string | null | undefined,
): string[] {
  if (!cost) return [];
  return decodeCostText(cost)
    .split("/")
    .map((part) => {
      const pieces = part.trim().split(";");
      return (pieces[1] ?? pieces[0] ?? "").trim();
    })
    .filter(Boolean);
}

export function shipHasCurrencyCode(
  cost: string | null | undefined,
  currencyCode: string,
): boolean {
  const needle = currencyCode.trim().toLowerCase();
  if (!needle) return false;
  return shipCostCurrencyCodes(cost).some(
    (code) => code.toLowerCase() === needle,
  );
}

function currencyInfoFor(
  currencyCode: string,
): { label: string; color: string } | undefined {
  if (currencyInfo[currencyCode]) return currencyInfo[currencyCode];
  const match = Object.keys(currencyInfo).find(
    (key) => key.toLowerCase() === currencyCode.toLowerCase(),
  );
  return match ? currencyInfo[match] : undefined;
}

export function currencyDisplayLabel(currencyCode: string): string {
  const decoded = decodeCostText(currencyCode).trim();
  const info = currencyInfoFor(decoded);
  if (info) return info.label;
  const named = Object.entries(costNames).find(
    ([key]) => key.toLowerCase() === decoded.toLowerCase(),
  );
  return named?.[1] ?? decoded;
}

export function parseShipCost(cost: string | null | undefined): ShipCost[] {
  if (!cost) {
    return [];
  }

  return decodeCostText(cost)
    .split("/")
    .map((part) => {
      const [amount, currencyCode] = part.trim().split(";");

      if (!amount || !currencyCode) {
        return null;
      }

      const info = currencyInfoFor(currencyCode) ?? {
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
  PPP5: "Epic Phoenix Prize Pack Token",
  APP: "Anniversary Prize Pack",

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
