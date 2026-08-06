import { describe, it, expect } from "vitest";
import {
  buildBreadcrumbs,
  type BreadcrumbRouteRecord,
} from "@/logic/buildBreadcrumbs";

const shipsRoute: BreadcrumbRouteRecord = {
  path: "/ships",
  meta: { breadcrumb: "Ships" },
};

const shipDetailsRoute: BreadcrumbRouteRecord = {
  path: "/ships/:id",
  meta: { breadcrumb: "Ship Details", parent: "/ships" },
};

const traitsRoute: BreadcrumbRouteRecord = {
  path: "/traits",
  meta: { breadcrumb: "Traits" },
};

const routes = [shipsRoute, shipDetailsRoute, traitsRoute];

describe("buildBreadcrumbs", () => {
  it("returns only Home on the home path", () => {
    expect(
      buildBreadcrumbs({ path: "/", matched: [], routes }),
    ).toEqual([{ title: "Home", to: "/", disabled: true }]);
  });

  it("builds Home > Ships for the ships list", () => {
    expect(
      buildBreadcrumbs({
        path: "/ships",
        matched: [shipsRoute],
        routes,
      }),
    ).toEqual([
      { title: "Home", to: "/", disabled: false },
      { title: "Ships", disabled: true },
    ]);
  });

  it("includes parent and optional title for ship details", () => {
    expect(
      buildBreadcrumbs({
        path: "/ships/42",
        matched: [shipDetailsRoute],
        routes,
        title: "U.S.S. Enterprise",
      }),
    ).toEqual([
      { title: "Home", to: "/", disabled: false },
      { title: "Ships", to: "/ships", disabled: false },
      { title: "U.S.S. Enterprise", disabled: true },
    ]);
  });

  it("falls back to route meta breadcrumb when title is omitted", () => {
    expect(
      buildBreadcrumbs({
        path: "/ships/42",
        matched: [shipDetailsRoute],
        routes,
      }),
    ).toEqual([
      { title: "Home", to: "/", disabled: false },
      { title: "Ships", to: "/ships", disabled: false },
      { title: "Ship Details", disabled: true },
    ]);
  });
});
