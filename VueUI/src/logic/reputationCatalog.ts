/** Browser title for the reputation catalog, including specializations. */
export const REPUTATION_BROWSER_TITLE = "Reputations and Specializations";

export type ReputationCatalogKind = "reputation" | "specialization";

export type ReputationEnvironmentSource = {
  environment?: string | null;
};

/**
 * Cargo stores specializations with an environment and reputations with none.
 */
export function reputationCatalogKind(
  environment: string | null | undefined,
): ReputationCatalogKind {
  return environment?.trim() ? "specialization" : "reputation";
}

export function reputationKindLabel(
  environment: string | null | undefined,
): string {
  return reputationCatalogKind(environment) === "specialization"
    ? "Specialization"
    : "Reputation";
}

export function filterReputationCatalog<T extends ReputationEnvironmentSource>(
  items: readonly T[],
  kind: ReputationCatalogKind,
): T[] {
  return items.filter((item) => reputationCatalogKind(item.environment) === kind);
}

export function reputationTabEmptyMessage(kind: ReputationCatalogKind): string {
  return kind === "specialization"
    ? "No specializations in this list."
    : "No reputations in this list.";
}
