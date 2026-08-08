export function getSearchResultRoute(type: string, id: number) {
  switch (type) {
    case "Ship":
      return { name: "ship-details", params: { id } };
    case "Trait":
      return { name: "trait-details", params: { id } };
    case "StarshipTrait":
      return { name: "starship-trait-details", params: { id } };
    case "TraySkill":
      return { name: "tray-skill-details", params: { id } };
    case "Reputation":
      return { name: "reputation-details", params: { id } };
    case "SetBonus":
      return { name: "set-bonus-details", params: { id } };
    case "Modifier":
      return { name: "modifier-details", params: { id } };
    case "Mastery":
      return { name: "mastery-details", params: { id } };
    default:
      return { path: "/" };
  }
}
