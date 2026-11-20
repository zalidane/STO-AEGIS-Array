export type ImageFetchDecision =
  | "skip-local"
  | "skip-remote"
  | "skip-known-missing"
  | "fetch";

const PRESENT_STATUSES = new Set(["exists", "downloaded"]);

/**
 * Incremental extract: keep files already on disk, keep files the prior
 * imageIndex says were present when the remote image host still has them,
 * do not re-query titles already known missing on the wiki, and only fetch
 * genuinely new (or failed / lost) work.
 *
 * `remotePresent`:
 * - `true`  the public image host (R2) has the object, or the caller trusts
 *           the committed index because no remote check is configured
 * - `false` the host was checked and the object is gone → re-fetch
 * - omitted / `null` no remote information → previous local-only behavior
 */
export function decideImageFetch(input: {
  force: boolean;
  localBytes: number | null;
  priorStatus: string | null;
  remotePresent?: boolean | null;
}): ImageFetchDecision {
  if (input.force) return "fetch";
  if (input.localBytes != null && input.localBytes > 0) return "skip-local";
  if (input.priorStatus === "missing" || input.priorStatus === "skipped") {
    return "skip-known-missing";
  }
  if (
    input.priorStatus != null &&
    PRESENT_STATUSES.has(input.priorStatus) &&
    input.remotePresent === true
  ) {
    return "skip-remote";
  }
  return "fetch";
}
