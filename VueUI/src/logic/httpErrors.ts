import { GITHUB_BUG_REPORT_LABEL, GITHUB_BUG_REPORT_URL } from "@/logic/about";

export const HTTP_ERROR_STATUSES = [404, 500] as const;

export type HttpErrorStatus = (typeof HTTP_ERROR_STATUSES)[number];

export type HttpErrorAction =
  | { kind: "link"; label: string; to: string }
  | { kind: "external"; label: string; href: string }
  | { kind: "reload"; label: string };

export type HttpErrorPage = {
  status: HttpErrorStatus;
  title: string;
  lede: string;
  actions: HttpErrorAction[];
};

const HOME: HttpErrorAction = { kind: "link", label: "Home", to: "/" };
const SEARCH: HttpErrorAction = { kind: "link", label: "Search", to: "/search" };
const COLLECTION: HttpErrorAction = {
  kind: "link",
  label: "Collection",
  to: "/collection",
};
const BUG_REPORT: HttpErrorAction = {
  kind: "external",
  label: GITHUB_BUG_REPORT_LABEL,
  href: GITHUB_BUG_REPORT_URL,
};

const PAGES: Record<HttpErrorStatus, HttpErrorPage> = {
  404: {
    status: 404,
    title: "This page is not in the array",
    lede: "That URL does not match a catalog page, collection, or shared build.",
    actions: [HOME, SEARCH, COLLECTION],
  },
  500: {
    status: 500,
    title: "Something went wrong",
    lede: "The app hit an unexpected error. Captains and loadouts stored in this browser are still here.",
    actions: [HOME, { kind: "reload", label: "Try again" }, BUG_REPORT],
  },
};

export function resolveHttpErrorStatus(value: unknown): HttpErrorStatus {
  if (value === 404 || value === 500) return value;
  if (value === "404" || value === "500") return Number(value) as HttpErrorStatus;
  return 500;
}

export function httpErrorPage(status: unknown): HttpErrorPage {
  return PAGES[resolveHttpErrorStatus(status)];
}

export function httpErrorStatusFromRoute(input: {
  name?: string | symbol | null;
  meta?: object;
}): HttpErrorStatus {
  const meta = input.meta as { httpStatus?: unknown } | undefined;
  if (meta?.httpStatus != null) return resolveHttpErrorStatus(meta.httpStatus);
  if (input.name === "server-error") return 500;
  return 404;
}
