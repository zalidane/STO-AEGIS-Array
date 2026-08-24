export type CookieJar = Record<string, string>;

export function parseSetCookieHeaders(headers: readonly string[]): CookieJar {
  const jar: CookieJar = {};
  for (const header of headers) {
    const pair = header.split(";")[0];
    if (!pair) continue;
    const eq = pair.indexOf("=");
    if (eq <= 0) continue;
    const name = pair.slice(0, eq).trim();
    const value = pair.slice(eq + 1).trim();
    if (name) jar[name] = value;
  }
  return jar;
}

export function mergeCookies(current: CookieJar, incoming: CookieJar): CookieJar {
  return { ...current, ...incoming };
}

export function cookieHeader(jar: CookieJar): string {
  return Object.entries(jar)
    .map(([name, value]) => `${name}=${value}`)
    .join("; ");
}
