export type BreadcrumbItem = {
  title: string;
  to?: string;
  disabled?: boolean;
};

/** Compatible with Vue Router's RouteMeta (empty interface by default). */
export type BreadcrumbRouteRecord = {
  path: string;
  meta: object;
};

type BreadcrumbMeta = {
  breadcrumb?: unknown;
  parent?: unknown;
};

function readMeta(meta: object): BreadcrumbMeta {
  return meta as BreadcrumbMeta;
}

export function buildBreadcrumbs(options: {
  path: string;
  matched: BreadcrumbRouteRecord[];
  routes: BreadcrumbRouteRecord[];
  title?: string;
}): BreadcrumbItem[] {
  const { path, matched, routes, title } = options;

  const items: BreadcrumbItem[] = [
    {
      title: "Home",
      to: "/",
      disabled: path === "/",
    },
  ];

  if (path === "/") {
    return items;
  }

  const crumbRoutes = matched.filter(
    (route) => readMeta(route.meta).breadcrumb,
  );
  const leaf =
    crumbRoutes[crumbRoutes.length - 1] ?? matched[matched.length - 1];

  const parents: BreadcrumbRouteRecord[] = [];
  let parentPath = leaf ? readMeta(leaf.meta).parent : undefined;

  while (typeof parentPath === "string") {
    const parent = routes.find((route) => route.path === parentPath);
    if (!parent) break;
    parents.unshift(parent);
    parentPath = readMeta(parent.meta).parent;
  }

  for (const parent of parents) {
    const parentMeta = readMeta(parent.meta);
    if (!parentMeta.breadcrumb) continue;
    items.push({
      title: String(parentMeta.breadcrumb),
      to: parent.path,
      disabled: false,
    });
  }

  for (let i = 0; i < crumbRoutes.length; i++) {
    const route = crumbRoutes[i];
    const routeMeta = readMeta(route!.meta);
    const isLast = i === crumbRoutes.length - 1;
    items.push({
      title: isLast && title ? title : String(routeMeta.breadcrumb),
      to: isLast ? undefined : route!.path,
      disabled: isLast,
    });
  }

  return items;
}
