import { describe, expect, it } from "vitest";
import {
  CATALOG_WATCH_FETCH_POLICY,
  apolloClient,
} from "@/apollo";

describe("catalog Apollo fetch policy", () => {
  it("refreshes watch queries so a Cargo import is not hidden by cache-first", () => {
    expect(CATALOG_WATCH_FETCH_POLICY).toBe("cache-and-network");
    expect(apolloClient.defaultOptions.watchQuery?.fetchPolicy).toBe(
      "cache-and-network",
    );
  });
});
