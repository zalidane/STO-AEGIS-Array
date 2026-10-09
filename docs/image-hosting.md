# Image hosting (Cloudflare R2)

Wiki icons and ship renders are served at runtime from a Cloudflare R2 bucket.
The Vue app builds those URLs from `VITE_IMAGE_BASE_URL`. When that variable is
unset, URLs stay on the local Vite path `/images/...`, so local dev, unit
tests, and the current Railway deploy keep working before the bucket exists.

**Status (Oct 9, 2026):** the cutover is done. `VueUI/public/images/` was removed
from git and scrubbed from history, and it is now gitignored (except `NOTICE`).
Keep local copies on the machine that runs the Extractor and `images:sync`.

Planned public origin: `https://img.aegisarray.com`.

Object keys match the path after `/images`:

```text
items/<filename>
ships/<filename>
traits/<filename>
starship-traits/<filename>
tray-skills/<filename>
```

Example: `VITE_IMAGE_BASE_URL=https://img.aegisarray.com` and file
`Fed_Ship_Achilles.png` → `https://img.aegisarray.com/ships/Fed_Ship_Achilles.png`.

UI placeholders stay in the repo and are **not** uploaded:

- `VueUI/public/placeholders/ship-placeholder.png` → `/placeholders/ship-placeholder.png`
- `VueUI/public/placeholders/trait-placeholder.png`
- `VueUI/public/placeholders/starship-trait-placeholder.png`

## Environment variables

Frontend (VueUI, inlined at **build** time):

| Name | Required | Purpose |
| --- | --- | --- |
| `VITE_IMAGE_BASE_URL` | no | Public image origin, no trailing slash. Unset → `/images`. |

Sync (home machine only; never commit real values):

| Name | Required | Purpose |
| --- | --- | --- |
| `R2_ENDPOINT` | yes | `https://<ACCOUNT_ID>.r2.cloudflarestorage.com` |
| `R2_BUCKET` | yes | Bucket name |
| `R2_ACCESS_KEY_ID` | yes | R2 API token access key id |
| `R2_SECRET_ACCESS_KEY` | yes | R2 API token secret |
| `R2_REGION` | no | Defaults to `auto` |

Put them in the repo-root `.env` (gitignored) or export them in the shell.
The sync script reads the environment and `.env`. It has no credential flags
and does not print secret values.

`VITE_IMAGE_BASE_URL` is read by Vite from the VueUI service environment at
build time, or from `VueUI/.env.local` / the shell for a local build. Leave it
unset until a sample object returns 200. Changing it requires a VueUI rebuild.

## 1. Create the bucket

In the Cloudflare dashboard: **R2 → Create bucket**.

- Name: `aegis-images` (any name is fine; set `R2_BUCKET` to match).
- Location: **Western North America** (`wnam`). That hint is closest to the
  Railway services in sfo. Location hints are best-effort, optional, and fixed
  the first time a bucket name is created
  ([Data location](https://developers.cloudflare.com/r2/reference/data-location/),
  checked Aug 19, 2026). Automatic is also fine.
- Do **not** enable the public `r2.dev` development URL. It is rate-limited,
  not for production, and it bypasses WAF and transform rules on the custom
  domain ([Public buckets](https://developers.cloudflare.com/r2/buckets/public-buckets/),
  checked Sep 25, 2026).

Create an R2 API token with **Object Read & Write** scoped to this bucket.
Copy the access key id, secret, and the S3 endpoint into `.env`. You only need
the token on the machine that runs the sync. The browser never sees it.

## 2. Custom domain

`img.aegisarray.com` has to be a hostname on a zone in the **same** Cloudflare
account as the bucket.

`aegisarray.com` DNS is authoritative at Porkbun today. Two ways to put the
zone on Cloudflare:

- **Full setup (Free plan).** Add the zone, copy every existing Porkbun record
  into Cloudflare before changing nameservers (apex and `www` that point at
  Railway, plus MX, TXT, and anything else), then switch the nameservers at
  Porkbun to the pair Cloudflare shows. This is the path that works on the
  Free plan.
- **Partial (CNAME) setup.** Keeps Porkbun authoritative and proxies only
  chosen hostnames. Available only on **Business or Enterprise**
  ([CNAME setup](https://developers.cloudflare.com/dns/zone-setups/partial-setup/),
  checked Aug 14, 2026). Not required if the nameservers move.

After the zone is active:

1. R2 → the bucket → **Settings → Custom Domains → Add**.
2. Enter `img.aegisarray.com` and confirm the DNS record Cloudflare adds.
3. Wait until the domain status is **Active**.
4. Leave the `r2.dev` URL disabled.

R2 custom domains are proxied, so cache and the rules below apply. Default
cache already covers `png`, `jpg`, and `avif`. The sync sets `Cache-Control`
on each object; Cloudflare honors that origin header. A hit shows
`cf-cache-status: HIT`.

`Cache-Control` used by the sync:

```text
public, max-age=2592000, stale-while-revalidate=86400
```

Do not use `immutable`. Filenames are stable wiki titles, and a later extract
can replace the bytes at the same key.

## 3. Sync

From the monorepo root, on the home machine that already has
`VueUI/public/images/`:

```bash
npm run images:sync -- --dry-run
npm run images:sync
```

`--dry-run` with the R2 variables set lists what would upload and does not
write. `--dry-run` without those variables only inventories local files and
prints the missing variable names (not their values).

```bash
npm run images:sync -- --delete
```

`--delete` removes remote objects under the five prefixes that are not on
disk. It is off by default so a partial local tree cannot empty the bucket.
A missing kind folder is not scanned and is not deleted. `NOTICE`, placeholder
filenames, empty files, and unknown extensions are skipped.

Content-Type is set from the extension, including the odd ones in this tree:

| Extension | Content-Type |
| --- | --- |
| `.png` | `image/png` |
| `.jpg` / `.jpeg` / `.jfif` | `image/jpeg` |
| `.avif` | `image/avif` |
| `.gif` | `image/gif` |
| `.webp` | `image/webp` |

`.jfif` is JPEG. `.avif` must be `image/avif`, not a generic type. Matching is
case-insensitive (the tree has a few `.PNG` files). Vite's dev server sends
`galaxy-class-angled.jfif` with an empty `Content-Type`, so the sync script
sets `image/jpeg` itself instead of trusting the extension map.

The script uses `@aws-sdk/client-s3` with `requestChecksumCalculation` and
`responseChecksumValidation` set to `WHEN_REQUIRED`, because current AWS SDKs
send a CRC32 checksum header that R2 rejects. Re-runs upload only when the
size or single-part MD5 ETag differs.

After a home extract, `npm run extract:home` reminds you to sync images. Commit
the JSON under `Extractor/output/`. Do not treat the image binaries as the
thing to commit for hosting.

## 4. Point the frontend at the bucket

Only after a direct request works, for example:

```bash
curl -sI "https://img.aegisarray.com/ships/Fed_Ship_Achilles.png"
```

Expect `200`, `content-type: image/png` (or the file's real type), and the
`Cache-Control` value above.

On the Railway **VueUI** service set:

```text
VITE_IMAGE_BASE_URL=https://img.aegisarray.com
```

Redeploy so the build inlines it. Then check Ships, Collection, Loadout
Builder, and trait pages. Placeholders still load from the Vue app
(`/placeholders/...`), including when a wiki image 404s.

Leave the variable unset to roll back to `/images` on the next build. The
files are still in git until a later, separate removal.

## 5. Cloudflare rules (manual)

Apply both rules on the `aegisarray.com` zone after `img.aegisarray.com` is
active. Paste them into the **Expression Editor**. The visual builder does not
support grouping parentheses
([operators](https://developers.cloudflare.com/ruleset-engine/rules-language/operators/),
checked Oct 1, 2026).

`matches` (regex) is Business/Enterprise only, so these rules use `wildcard`,
which is case-insensitive and must match the **entire** header value. `*` is
zero or more characters. `http*://` covers both `http://` and `https://`.

A missing Referer is not the same as `""` in the rules language: a nil value
makes `http.referer ne ""` true, which would block direct visits. `coalesce`
turns nil into `""` first
([values](https://developers.cloudflare.com/ruleset-engine/rules-language/values/),
checked Oct 1, 2026). `lower(http.host)` is used because string `eq` is
case-sensitive.

### (a) WAF custom rule — hotlink block

Dashboard: **Security → Security rules → Create rule → Custom rules**
([create a custom rule](https://developers.cloudflare.com/waf/custom-rules/create-dashboard/),
checked Aug 3, 2026).

- Name: `Block hotlinked image requests`
- Action: **Block**
- Expression (paste as one line):

```text
(lower(http.host) eq "img.aegisarray.com" and coalesce(http.referer, "") ne "" and not (http.referer wildcard "http*://aegisarray.com" or http.referer wildcard "http*://aegisarray.com/*" or http.referer wildcard "http*://aegisarray.com:*" or http.referer wildcard "http*://www.aegisarray.com" or http.referer wildcard "http*://www.aegisarray.com/*" or http.referer wildcard "http*://www.aegisarray.com:*"))
```

What it allows and blocks:

| Referer | Result |
| --- | --- |
| Missing or empty | Allowed (direct visits, some privacy browsers) |
| `https://aegisarray.com/ships` | Allowed |
| `https://www.aegisarray.com/` | Allowed |
| `http://aegisarray.com/ships` | Allowed |
| `https://AegisArray.com/ships` | Allowed (`wildcard` is case-insensitive) |
| `https://evil.example/` | Blocked |
| `https://aegisarray.com.evil.example/` | Blocked (the next character is `.`, not `/` or `:`) |
| `https://notaegisarray.com/` | Blocked |
| `https://vueui-production.up.railway.app/` | Blocked |

The Railway default hostname is blocked on purpose: the rule only allows
`aegisarray.com` and `www.aegisarray.com`. Add the same three `wildcard`
clauses for `vueui-production.up.railway.app` if that host should still show
images. Local `http://localhost:5173` is also blocked, so leave
`VITE_IMAGE_BASE_URL` unset for local dev (Vite serves `/images` from disk).
An empty Referer still works, so `curl` without a Referer is a valid check.

Referer can be spoofed. This stops casual embedding; it is not access control.

**Hotlink Protection** is the simpler alternative: **Security → Settings →
Hotlink Protection**
([docs](https://developers.cloudflare.com/waf/tools/scrape-shield/hotlink-protection/),
checked Aug 3, 2026). It already allows a blank Referer and blocks other
sites. It is zone-wide unless a configuration rule narrows it, and it only
covers `gif`, `ico`, `jpg`, `jpeg`, and `png`. It does **not** cover `.avif`
or `.jfif`. Use the custom rule above so every object on
`img.aegisarray.com` is covered. Do not enable both if their allow-lists
disagree.

### (b) Response header — image credit

Dashboard: **Rules → Overview → Create rule → Response Header Transform Rule**
([create in the dashboard](https://developers.cloudflare.com/rules/transform/response-header-modification/create-dashboard/),
checked May 5, 2026).

- Name: `Image credit header`
- When incoming requests match, expression:

```text
(lower(http.host) eq "img.aegisarray.com")
```

- Modify response header: **Set static**
- Header name: `X-Image-Credit`
- Value: `© Cryptic Studios / Arc Games / Paramount - unofficial fan project`

Set static adds the header or replaces one with the same name
([Response Header Transform Rules](https://developers.cloudflare.com/rules/transform/response-header-modification/),
checked Sep 4, 2026). The `©` character is U+00A9 (Latin-1). This header does
not change caching. Confirm with:

```bash
curl -sI "https://img.aegisarray.com/ships/Fed_Ship_Achilles.png" | grep -i x-image-credit
```

## Still manual after this repo change

1. Create the R2 bucket and API token. Leave `r2.dev` off.
2. Move `aegisarray.com` onto Cloudflare (full setup on the Free plan) and
   recreate the existing Porkbun records before cutting nameservers.
3. Attach `img.aegisarray.com` to the bucket.
4. Run `npm run images:sync` from the home machine.
5. Check a few object URLs (`content-type`, `cache-control`, `cf-cache-status`).
6. Set `VITE_IMAGE_BASE_URL` on VueUI and redeploy. Check the catalog pages.
7. Add the WAF custom rule and the response header rule above.
8. Done Oct 9, 2026: `VueUI/public/images/` removed from git and history, now gitignored.
