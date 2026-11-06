# Cloudflare hardening (Free plan)

The zone is `aegisarray.com`. Railway runs the Vue app with `vite preview`.
Wiki icons are Cloudflare R2 at `img.aegisarray.com`. This page is the
dashboard work that cannot be done from the repo. Origin behavior (404 for
dotfiles, `Cache-Control` on build output and R2 uploads) is already in the
app. See [image-hosting.md](image-hosting.md) for the bucket, the hotlink
rule, and the image credit header.

Checked against Cloudflare docs on Nov 5, 2026.

## Free plan limits

| Feature | Free plan |
| --- | --- |
| WAF custom rules | 5 (Block is allowed, regex `matches` is not) |
| Cache Rules | 10 |
| Minimum Edge Cache TTL | 2 hours |
| Default Browser Cache TTL | 4 hours |

`wildcard` is case-insensitive and must match the **entire** value. `contains`
and `eq` are case-sensitive, so these expressions wrap the path or host in
`lower()`. Paste each expression as one line into the **Expression Editor**.

The hotlink custom rule in [image-hosting.md](image-hosting.md) already uses
one of the five WAF slots. The rule below uses a second. Do not turn on both
Hotlink Protection and that custom rule.

## 1. Honor origin cache headers

**Caching → Configuration → Browser Cache TTL → Respect Existing Headers.**

The Free default is 4 hours, and Cloudflare raises a shorter origin
`Cache-Control` up to that value. The app sends
`public, max-age=0, must-revalidate` on HTML. Without this setting, browsers
can keep the SPA shell for 4 hours after a deploy and then request asset
hashes that no longer exist.

Leave **Caching Level** at Standard. Do not add a Cache Everything page rule.

## 2. Block secret and CMS probes

**Security → Security rules → Create rule → Custom rules.**

- Name: `Block secret and CMS probes`
- Action: **Block**
- Expression:

```text
(lower(http.request.uri.path) contains "/.env" or lower(http.request.uri.path) contains "/.git" or lower(http.request.uri.path) contains "/.aws" or lower(http.request.uri.path) contains "/.ssh" or lower(http.request.uri.path) contains "/.htaccess" or lower(http.request.uri.path) contains "/.htpasswd" or lower(http.request.uri.path) contains "/.svn" or lower(http.request.uri.path) wildcard "*/wp-admin*" or lower(http.request.uri.path) wildcard "*/wp-login.php*" or lower(http.request.uri.path) wildcard "*/xmlrpc.php*" or lower(http.request.uri.path) wildcard "*/wp-config*")
```

`contains "/.env"` matches `/.env`, `/notifications/.env`, and `/.env.bak`.
`contains "/.git"` also matches `/.gitignore` and `/.github`, which this site
does not serve. The origin returns 404 for the same paths if a request gets
past the WAF. Block is a Cloudflare 403 and does not reveal whether a file
exists.

Place this rule above any Skip rule so a later skip cannot exempt the probes.

## 3. Cache hashed assets and images

**Caching → Cache Rules.** Rules run in order and the first match wins. Create
these three, top to bottom. Each one sets **Cache eligibility** to **Eligible
for cache**.

### Hashed build assets

- Name: `Cache hashed build assets`
- Expression:

```text
(starts_with(lower(http.request.uri.path), "/assets/"))
```

- Edge TTL: **Use cache-control header if present, bypass cache if not**
- Browser TTL: **Respect origin**

Vite fingerprints these URLs (`/assets/index-<hash>.css`,
`/assets/materialdesignicons-webfont-<hash>.woff2`). The origin sends:

```text
Cache-Control: public, max-age=31536000, immutable
CDN-Cache-Control: public, max-age=31536000
```

That is a 1 year edge TTL, above the Free minimum of 2 hours. Respect origin
keeps `immutable` on the browser. Overriding the browser TTL would replace
that header and drop `immutable`. Do not pick **Ignore cache-control header
and use this TTL**: a missing `/assets/` URL falls through to `index.html`
with `max-age=0`, and ignoring that header would store the shell for a year.

### Stable images on the site

- Name: `Cache site images`
- Expression:

```text
((not starts_with(lower(http.request.uri.path), "/assets/")) and (lower(http.request.uri.path) wildcard "*.png" or lower(http.request.uri.path) wildcard "*.jpg" or lower(http.request.uri.path) wildcard "*.jpeg" or lower(http.request.uri.path) wildcard "*.gif" or lower(http.request.uri.path) wildcard "*.webp" or lower(http.request.uri.path) wildcard "*.avif" or lower(http.request.uri.path) wildcard "*.svg" or lower(http.request.uri.path) wildcard "*.ico" or lower(http.request.uri.path) wildcard "*.jfif"))
```

- Edge TTL: **Use cache-control header if present, bypass cache if not**
- Browser TTL: **Respect origin**

This covers favicons and `/placeholders/*`. It does not cover `/assets/`,
which the previous rule already matched. These filenames are not hashed. The
origin sends `max-age=2592000` (30 days) and not `immutable`. A missing image
URL is rewritten to `index.html` with `max-age=0`, so the edge must follow
the origin header instead of forcing 30 days.

### Image host

- Name: `Cache image host`
- Expression:

```text
(lower(http.host) eq "img.aegisarray.com")
```

- Edge TTL: **Ignore cache-control header and use this TTL** → **1 month**
  (2592000 seconds). In the same Edge TTL section, add a **status code TTL**
  for **400 and above** set to **No cache** (0). R2 404s must not sit at the
  edge for a month.
- Browser TTL: **Respect origin**

Do not use 1 year, and do not mark these objects `immutable`. Object keys are
stable wiki filenames (`traits/<name>.png`). A later extract replaces the
bytes at the same key. The sync already sets:

```text
Cache-Control: public, max-age=2592000, stale-while-revalidate=86400
```

A month at the edge matches that header and is above the 2 hour Free minimum.
Ignoring the origin edge TTL still caches objects that were uploaded before
the header existed. `npm run images:sync` does not rewrite `Cache-Control` on
an object whose size and MD5 are unchanged. Respect origin leaves
`stale-while-revalidate` in place when the header is already there.

HTML is not in these rules. The origin sends `CDN-Cache-Control: no-store`
for the shell, so Cloudflare does not edge-cache `index.html` or SPA routes
such as `/ships`.

## 4. Check

After the VueUI service redeploys:

```bash
curl -sI "https://aegisarray.com/notifications/.env" | head -n 1
curl -sI "https://aegisarray.com/assets/index.css" | head -n 1
```

The `.env` probe should be **403** from the WAF (or **404** from origin if
the rule is not active yet). It must not be **200**.

```bash
curl -sI "https://aegisarray.com/" | grep -i -E 'cache-control|cdn-cache-control|cf-cache-status'
curl -sI "https://aegisarray.com/favicon.ico" | grep -i -E 'cache-control|cf-cache-status'
curl -sI "https://img.aegisarray.com/ships/Fed_Ship_Achilles.png" | grep -i -E 'cache-control|cf-cache-status|content-type'
```

Expect `max-age=0` on `/`, `immutable` on a real `/assets/<hashed file>`
(copy the path from the page source; `index.css` above is only a missing-file
check), and `max-age=2592000` on the image. A second image request should
show `cf-cache-status: HIT`. The first request after the rule is saved is a
miss.
