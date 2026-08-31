/** Dialog copy for the builder combat-log info control. */
export const COMBAT_LOG_INFO_TITLE = "About combat logs";

export function combatLogInfoParagraphs(captainName: string): string[] {
  const captain = captainName.trim() || "this captain";
  return [
    "This builder does not predict DPS. It is inventory on a ship, not a combat sim.",
    "You can optionally upload your combatlog.log to see measured DPS per fight.",
    `The parser stays in the browser, keeps ${captain}, and does not store the raw file.`,
    "Map names are not in the log — fights split on idle gaps.",
    "If the game is running, copy the log out of the GameClient folder first.",
  ];
}
