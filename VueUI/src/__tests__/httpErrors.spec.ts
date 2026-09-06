import { describe, expect, it } from "vitest";
import {
  httpErrorPage,
  httpErrorStatusFromRoute,
  resolveHttpErrorStatus,
} from "@/logic/httpErrors";
import {
  GITHUB_BUG_REPORT_LABEL,
  GITHUB_BUG_REPORT_URL,
} from "@/logic/about";

describe("http error pages", () => {
  it("describes a 404 with catalog recovery links", () => {
    const page = httpErrorPage(404);
    expect(page.status).toBe(404);
    expect(page.title).toMatch(/not in the array/i);
    expect(page.actions).toEqual([
      { kind: "link", label: "Home", to: "/" },
      { kind: "link", label: "Search", to: "/search" },
      { kind: "link", label: "Collection", to: "/collection" },
    ]);
  });

  it("describes a 500 that keeps local collection in mind", () => {
    const page = httpErrorPage(500);
    expect(page.status).toBe(500);
    expect(page.lede).toMatch(/browser/i);
    expect(page.actions).toEqual([
      { kind: "link", label: "Home", to: "/" },
      { kind: "reload", label: "Try again" },
      {
        kind: "external",
        label: GITHUB_BUG_REPORT_LABEL,
        href: GITHUB_BUG_REPORT_URL,
      },
    ]);
  });

  it("treats unknown codes as 500", () => {
    expect(resolveHttpErrorStatus(403)).toBe(500);
    expect(httpErrorPage("nope").status).toBe(500);
  });

  it("reads status from route meta, then the 500 route name", () => {
    expect(httpErrorStatusFromRoute({ meta: { httpStatus: 404 } })).toBe(404);
    expect(httpErrorStatusFromRoute({ name: "server-error" })).toBe(500);
    expect(httpErrorStatusFromRoute({ name: "not-found" })).toBe(404);
  });
});
