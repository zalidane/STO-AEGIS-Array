export type ImageFetchDecision = "skip-local" | "skip-known-missing" | "fetch";

/**
 * Incremental extract: keep files already on disk, do not re-query titles
 * already known missing on the wiki, and only fetch genuinely new (or failed) work.
 */
export function decideImageFetch(input: {
  force: boolean;
  localBytes: number | null;
  priorStatus: string | null;
}): ImageFetchDecision {
  if (input.force) return "fetch";
  if (input.localBytes != null && input.localBytes > 0) return "skip-local";
  if (input.priorStatus === "missing" || input.priorStatus === "skipped") {
    return "skip-known-missing";
  }
  return "fetch";
}
