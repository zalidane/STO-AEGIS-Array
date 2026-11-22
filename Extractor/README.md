# Extractor

Extracts Star Trek Online game data from [STOWiki](https://stowiki.net) Cargo tables into `output/*.json`, then imports those files into PostgreSQL via `@sto-aegis/database`. Image files are downloaded into `VueUI/public/images/`. After Cargo extract, experimental-weapon names are scraped from hull wikitext into `output/ShipExperimentalWeapons.json` (not a Cargo table).

Cargo gaps are filled at import, and Cargo stays the source of the committed JSON. **CatalogSupplement** (a database table) holds corrections that must survive without a repository update: modifier tokens, missing reputation factions, set-bonus membership, and personal-trait `career`. Import merges those rows with the Cargo file before writing Prisma models. Cargo remains primary: supplements insert missing rows and may widen `type` / `available` / `Members` or fill empty reputation fields and empty `career`, but do not overwrite non-empty wiki `stats`, `Passives`, or reputation descriptions.

**Workflow**

1. **Extract (manual or monthly home check, local)** — fetch wiki → commit `output/*.json`, then sync images to object storage (`npm run images:sync`). If Cloudflare blocks Node, download images [through the browser](#downloading-images-through-the-browser-when-cloudflare-blocks-node).
2. **Import (automatic, on deploy)** — GraphQL's Railway pre-deploy command (`npm run railway:predeploy`) reads the committed JSON, merges `CatalogSupplement` rows, and writes the production DB over the private network. See [`docs/railway-private-db.md`](../docs/railway-private-db.md).

Production never hits STOWiki; it only imports JSON shipped in git. Run extract from a home/residential IP, not Railway.

## Incremental behavior (what actually skips the wiki)

| Stage | Incremental? | Behavior |
|-------|--------------|----------|
| **Cargo tables** | Age-gated full refresh | If `output/{Table}.json` is newer than **24 hours**, that table is skipped. When stale (or `--force-refresh`), extract re-fetches the **entire** table — not row-level deltas. |
| **ShipExperimentalWeapons** | Yes (new hulls) | Only experimental ships missing from the sidecar JSON are scraped. Delete the sidecar to rebuild. `--force-refresh` does **not** re-scrape existing hulls. |
| **Images** | Yes (files) | Skips files already under `VueUI/public/images/`; skips `imageIndex.json` rows marked `exists`/`downloaded` that the public image host (R2) still serves; skips titles already recorded missing/skipped. Only new, failed, or lost titles hit the wiki. `--force-images` re-queries and re-downloads. See [Images on a machine without the local image tree](#images-on-a-machine-without-the-local-image-tree). |
| **Official images category** | Cached list | Incremental image runs reuse `OfficialImages.json`; `--force-images` re-lists the category. |
| **Import / `linkRelations`** | N/A (no wiki) | Runs against committed JSON, then merges `CatalogSupplement`. Per-table hashes skip unchanged tables unless `--force-import`: local runs keep them in `output/importState.json` (gitignored); Railway's `import:deploy` keeps them in the `ImportState` table. A `CatalogSupplement` edit changes that hash, so the next import applies it without a new commit. |

There was no gap to “fix” for images — they were already file-level incremental. Cargo cannot be row-level incremental via the public Cargo API without fetching tables; the 24h gate plus the monthly home check is the intended skip policy.

## Images on a machine without the local image tree

Images are served from R2 (`VITE_IMAGE_BASE_URL`, e.g. `https://img.aegisarray.com`), so `VueUI/public/images/` is usually nearly empty. The image extract therefore checks the image host, not just the disk, before deciding what is new:

1. **R2 listing** (preferred): when `R2_ENDPOINT`, `R2_BUCKET`, `R2_ACCESS_KEY_ID`, and `R2_SECRET_ACCESS_KEY` are set (the same repo-root `.env` that `images:sync` uses), the bucket is listed once per kind. This is read-only.
2. **HTTP HEAD**: with no R2 credentials, each prior `exists`/`downloaded` row is HEAD-checked under the public base URL. That URL comes from `--image-base-url=URL`, `IMAGE_BASE_URL`, or `VITE_IMAGE_BASE_URL`. A 404, 403, or 410 means re-fetch. Throttling and network errors are retried, then the committed index is trusted.
3. **Index only**: with neither configured, rows the committed `imageIndex.json` marks present are trusted.

Rows skipped this way stay in `imageIndex.json` as `exists`, so Infobox and tray-skill stamping keep their filenames. Only newly downloaded files land on disk. `npm run images:sync` uploads only local files and never deletes remote objects unless you pass `--delete`. Don't use `--delete` from a sparse local tree, because it would remove everything that isn't on disk.

```bash
# print what would be fetched: no wiki requests, no file writes
npm run extract:images:plan
npm run extract:images:plan -- --image-base-url=https://img.aegisarray.com   # without R2 creds

# fetch just those, then upload just those
npm run extract:images
npm run images:sync -- --dry-run
npm run images:sync
```

`--no-remote-check` restores the old disk-only behavior.

## Downloading images through the browser (when Cloudflare blocks Node)

STOWiki's Cloudflare rules can block the extractor even from a home IP. A browser tab that has passed the check can still fetch files, so the planned list can be downloaded from the DevTools console instead.

```bash
# 1. Build the console script from the --plan list (no wiki requests)
npm run extract:images:browser-script
#    add -- --image-base-url=https://img.aegisarray.com if R2 creds are not in .env
#    writes Extractor/output/browser-download.js (gitignored)
```

2. In Chrome or Edge, open https://stowiki.net and pass any check. Open DevTools (F12) > Console, paste the file, and press Enter. Chrome may ask you to type `allow pasting` first.
3. A panel appears at the top right. Click **Pick images folder & start**, choose `<repo>/VueUI/public/images`, and allow edits. The folder picker needs a click, which is why the script adds a button.
   - Files are written into `items/`, `ships/`, `traits/` and the other subfolders. Files already there are skipped, so re-pasting resumes.
   - Requests are same-origin and run one at a time, 1.5–2.5 s apart. The script tries the hashed `/w/images/...` path first, then `/wiki/Special:FilePath/...`.
   - 403, 429, and 5xx responses back off for 5, 15, then 45 s. A Cloudflare challenge page stops the run. Reload the tab, pass the check, paste again, and start.
   - At the end, the console prints a summary and JSON lists of failures and files not on the wiki. `browser-download-report.json` is written to the images folder.
4. Fallback with no folder picker (Firefox/Safari, or if the picker fails): click **Save to Downloads instead**. Allow multiple downloads, then run `npm run images:import-downloads -- --from="%USERPROFILE%\Downloads"` (`--dry-run` to preview). Files are saved as `<kind>__<filename>`.
5. Rebuild the index without contacting the wiki, then upload:

```bash
npm run extract:images:offline     # = extract --images-only --no-fetch
npm run images:sync -- --dry-run
npm run images:sync
```

`--no-fetch` (alias `--offline`) records files now on disk as `exists` and stamps them into `Infobox.json` and `TraySkill.json`. Titles the browser report lists as 404 become `missing`, so later runs skip them. Anything else still unfetched becomes `failed`, so a later online run retries it.

## Monthly home extract (scheduled check)

Use this on a **home** machine so Railway never contacts stowiki.net / Cloudflare.

```bash
# from monorepo root — no-ops if last extract was < ~1 month ago
npm run extract:home

# always run (still keeps images incremental; no --force-images)
npm run extract:home -- --force

# print decision only (does not contact the wiki)
npm run extract:home -- --check-only
```

What runs when due: `extract --force-refresh` (full **Cargo** refresh; experimental-weapon sidecar and **images stay incremental** — no `--force-images`). `--force-refresh` is required so a fresh clone (JSON mtime = now) cannot skip the wiki via the 24h Cargo cache. After a successful extract, `Extractor/output/last-extract.json` is written (gitignored). If that file is missing, the check falls back to the newest Cargo JSON mtime.

After a real run, review the diff, commit updated `Extractor/output/*.json`, sync images with `npm run images:sync`, push. The GraphQL pre-deploy command (`npm run railway:predeploy`) imports the changed JSON on Railway; see [`docs/railway-private-db.md`](../docs/railway-private-db.md). `npm run import:prod` from the PC only works while the database has a public TCP proxy. Image hosting: [`docs/image-hosting.md`](../docs/image-hosting.md).

### Schedule examples

**Linux (systemd user timer)** — `~/.config/systemd/user/sto-aegis-extract.service`:

```ini
[Unit]
Description=STO AEGIS Array monthly wiki extract check

[Service]
Type=oneshot
WorkingDirectory=/path/to/STO-AEGIS-Array
ExecStart=/usr/bin/npm run extract:home
```

`~/.config/systemd/user/sto-aegis-extract.timer`:

```ini
[Unit]
Description=Weekly check; extract only if >1 month since last run

[Timer]
OnCalendar=weekly
Persistent=true

[Install]
WantedBy=timers.target
```

Then: `systemctl --user daemon-reload && systemctl --user enable --now sto-aegis-extract.timer`

**macOS (launchd)** — `~/Library/LaunchAgents/com.sto-aegis.extract.plist` with `StartCalendarInterval` (e.g. weekly) and `ProgramArguments` → `/usr/local/bin/npm`, `run`, `extract:home`, `WorkingDirectory` set to the repo. Load with `launchctl load ~/Library/LaunchAgents/com.sto-aegis.extract.plist`.

**Windows (Task Scheduler)** — create a weekly task: Action = Start a program, Program = `npm`, Arguments = `run extract:home`, Start in = your clone path. Or a `.cmd` that `cd`s to the repo and runs that command.

**cron (any Unix)** — weekly is enough because the script itself enforces the 1-month gate:

```cron
0 10 * * 0 cd /path/to/STO-AEGIS-Array && npm run extract:home >> ~/sto-aegis-extract.log 2>&1
```

## STOWiki access

Cargo reads on stowiki.net are public. **Bot passwords are optional** — Special:BotPasswords currently shows “API access is restricted” for normal accounts, so extract runs identified but unauthenticated.

1. Copy root `.env.example` to `.env` and set `STOWIKI_CONTACT` (email or GitHub URL). That value is sent in the User-Agent.
2. If wiki staff later enable a bot password for you, set `STOWIKI_BOT_USERNAME` (`YourAccount@BotName`) and `STOWIKI_BOT_PASSWORD`.
3. Ask in the official STO Discord [discord.com/invite/startrekonline](https://discord.com/invite/startrekonline) → **#wiki-discussion** if Cloudflare still challenges you, or if you want bot passwords / an allowlist.

The client sends a named User-Agent, keeps cookies, waits at least 2.5s between requests, and backs off on Cloudflare 403/429/challenge pages. It does not try to solve challenges. If a run is blocked, open https://stowiki.net in a browser on the same machine, wait, then retry. After the first image extract, later runs only resolve and download **new** catalog files (nothing already on disk, and no re-walk of Category:Official images). Pass `--force-images` to re-query the wiki and re-download everything. Run extract from a home/residential IP, not Railway.

## Setup

From the **monorepo root**:

```bash
npm install
cp .env.example .env
npm run db:generate
npm run db:migrate
```

Use root `.env` for the local DB, wiki contact, and R2 sync keys. `.env.production` (gitignored) is only for the `*:prod` scripts, which reach production only while its TCP proxy is temporarily on. Railway itself injects `DATABASE_URL`.

## Usage

```bash
# from monorepo root

# Cargo tables + catalog images (slow and polite on purpose)
npm run extract
npm run extract -- --force-refresh

# Monthly home check (no-op if last extract < ~1 month)
npm run extract:home
npm run extract:home -- --force
npm run extract:home -- --check-only

# Images only (uses existing output/*.json)
npm run extract:images
npm run extract:images:plan              # what would be fetched, no requests
npm run extract:images:browser-script    # DevTools downloader when Cloudflare blocks Node
npm run extract:images:offline           # re-index files on disk, no requests
npm run images:import-downloads -- --from=<dir>
npm run extract -- --images-only --force-images

# Publish local images to R2 (see docs/image-hosting.md); never add --delete from a sparse tree
npm run images:sync -- --dry-run
npm run images:sync

# Cargo only
npm run extract -- --skip-images

# Import committed JSON into local DB
npm run import
npm run import -- --force-import

# Import committed JSON into production from the PC (needs the DB's public TCP proxy)
npm run import:prod

# What Railway's GraphQL pre-deploy runs (platform DATABASE_URL, hashes in the DB)
npm run import:deploy
```

While each table is written, import prints a progress line with the table name, a bar, done/total rows, percent, and elapsed time. The timer keeps updating even if no rows advance (for example a database lock). After the bar finishes, the existing summary lines still print (`imported N records`, and the JSON-vs-database count warning when it applies). `Resolving relationships...` starts with a spinner, then a bar once the work is counted. In a terminal the line rewrites in place; in CI or redirected logs it prints a plain line about every 10%, plus a heartbeat if a table stalls.

## Cargo tables

Written to `output/{Name}.json`:

Infobox, Mastery, Reputation, SetBonus, Ships, StarshipTraits, Traits, TraySkill, GwObtain, SwObtain, Modifiers.

Import order is Infobox → Ships → StarshipTraits → Mastery → Modifiers → GwObtain → SwObtain → Reputation → SetBonus → Traits → TraySkill, then `linkRelations` (ship types, unique consoles, experimental weapons, trait-ship joins, HTML-entity name dedupe).

### Supplements

Cargo JSON stays the import source. Corrections are merged into those rows; they do not replace the local-first pipeline.

| Source | Merges into | Purpose |
|--------|-------------|---------|
| Database `CatalogSupplement` where `kind = Modifiers` | Modifiers | Missing tokens Cargo only publishes as combos (`[HullCap]`, `[ShCap]`, `[ShdHeal]`); clear `[HullHeal]` `available` so any deflector can offer it; widen `[Proc]` Type with `Ship Fore Weapon` (#10, #11) |
| Database `CatalogSupplement` where `kind = Reputation` | Reputation | Missing reputation factions (empty `environment`) that Cargo omits — e.g. Delta Alliance, Iconian Resistance — so the catalog matches the ~13 in-game tracks (#80) |
| Database `CatalogSupplement` where `kind = SetBonus` | SetBonus | Missing set pages (Nausicaan Weaponry Augmentation, Counter-Command Ordnance) plus `Members` globs so the loadout card can match weapons + career consoles (#13) |
| Database `CatalogSupplement` where `kind = Traits` | Traits | Fill empty profession `career` (`tac` / `eng` / `sci`) on lockbox personal traits Cargo left blank (#69) |

`CatalogSupplement` is one table for these kinds. `kind` is the Cargo table name and `payload` is the Cargo-shaped record that kind's merger already accepts. A later gap is more rows in this table plus that kind's existing merge function — not a new storage pattern and not a committed JSON file. Import never deletes these rows. Apply migrations before import so the seeded rows exist. The modifier seed is unchanged by the later migration that adds reputation, set-bonus, and trait rows.

Abbreviated combo halves are not seeded. `[Ac]` / `[Dm]` are short forms of `[Acc]` / `[Dmg]`, `[Sh]` of `[ShCap]`, `[C]` / `[R]` / `[Cp]` / `[Rg]` of `[Cap]` / `[Reg]`, `[KP]` / `[Wpn]` of `[KPerf]` / `[WpnDmg]`, and `[RegenHP]` of `[RegHP]`. Those standalones are already in Cargo.

To add another modifier correction without a repository update, insert a row and run import:

```sql
INSERT INTO "CatalogSupplement" ("kind", "key", "variant", "payload", "updatedAt")
VALUES (
  'Modifiers',
  '[Example]',
  '',
  '{"modifier":"[Example]","stats":"+__ Example","type":"Ship Deflector Dish","available":null,"isunique":"1","isepic":"0","info":null}'::jsonb,
  CURRENT_TIMESTAMP
);
```

`key` must match the identity field that kind's merger uses: `payload.modifier` for Modifiers, `payload.name` for Reputation and Traits, and `payload.Name` for SetBonus. `variant` is `''` unless the same key needs more than one correction (another modifier type match, or the same trait name under a different type and environment). Optional `_merge` inside a modifier `payload` follows the rules below.

Modifier supplement payloads are Cargo-shaped (`isunique` / `isepic` are `"0"` / `"1"`, as in the wiki extract). Optional `_merge` metadata (stripped before the Modifier write):

- `clearAvailable: true` — drop the Cargo item-name allowlist so eligibility follows **Type**
- `matchType: "…"` — when several Cargo rows share a modifier name, pick which `type` blob to widen

Reputation supplement rows are Cargo-shaped (`name`, `link`, `description`, `released`, `environment`, colors, `icon`). True reputations use empty/`null` `environment`; specialization tracks stay in Cargo with a non-empty `environment` (#79).

SetBonus supplement rows are also Cargo-shaped. Optional `Members` is a newline-separated list of item-name globs (`*` = any run of characters). The loadout matcher ignores Mk suffixes and counts at most one seated item per pattern (so two Heavy Bio-Molecular turrets still count as one piece).

Import hashes Cargo together with a fingerprint of that table's `CatalogSupplement` rows. Editing only the database rows still re-imports that table.

### Starship trait ranks (#12)

Cargo `StarshipTraits` stores one row per specialization family. Improved and Superior unlocks are underlined inside `obtained` (`Improved Going the Extra Mile`, `Superior Command Frequency`) and their numbers share one `detailed` string (`+10/15/20%`). Import expands each of those unlocks into its own `StarshipTrait` row, with that rank's stats and unlock line, so the catalog and loadout picker can select them. The base row keeps the family name and the base numbers. Traits the wiki does not list as Improved or Superior stay a single row (including traits whose name merely starts with Superior, such as Superior Area Denial). Rank rows reuse the family's icon. A later Cargo extract does not need to grow new pages for this; the next import reads the folded row and expands it again.

## CLI

| Command / flag | Effect |
|----------------|--------|
| `extract` | Fetch Cargo tables + experimental-weapon sidecar, then catalog images |
| `extract:home` | Run extract only if last local extract is older than ~1 month (or `--force`) |
| `import` | Import JSON into PostgreSQL + `linkRelations` |
| `--force-refresh` | Re-extract all Cargo tables from STOWiki |
| `--force-images` | Re-query the wiki and re-download image files even if they already exist |
| `--skip-images` | Cargo only |
| `--images-only` | Images only (needs `output/*.json`) |
| `--plan` | Images only: print the fetch plan; no wiki requests, no writes (`extract:images:plan`) |
| `--browser-script[=path]` | Images only: write the plan as a DevTools downloader, default `output/browser-download.js` (`extract:images:browser-script`) |
| `--no-fetch` / `--offline` | Images only: never contact the wiki; index files on disk (`extract:images:offline`) |
| `--no-remote-check` | Skip the R2 / HTTP check; trust only local files and `imageIndex.json` |
| `--image-base-url=URL` | Public image origin for HEAD checks when R2 credentials are not set |
| `--force-import` | Re-import all JSON files (ignore hash skip) |
| `--prod` | Load `.env.production` (used by `import:prod`; needs a temporary TCP proxy on production) |
| `--deploy` | Railway pre-deploy mode (used by `import:deploy`): skip `.env` files, keep hashes in the `ImportState` table, exit non-zero if any table fails |
| `--state=db` | Keep import hashes in the `ImportState` table instead of `output/importState.json` |
| `--force` / `--check-only` | With `extract:home` only: always run / print decision without extracting |

## Tests

From the monorepo root:

```bash
npm run test:extractor
```

Node’s test runner covers wiki helpers, ship name lookup, experimental-weapon parsing, modifier / reputation / set-bonus / traits supplement merge, the `CatalogSupplement` loader, import name dedupe, import progress formatting and throttling, the monthly home-extract schedule gate, R2 / HTTP image presence checks, the browser downloader script, browser-download import, image sync, and the database-backed import state.

## Images

Catalog rows map to wiki files (`File:{Name} icon.png` for items/traits, Cargo `image` for ships). Item Cargo names often include `Mk XII` and `[Acc]`/`[Dmg]x2` suffixes that the wiki file does not; extract tries the full name first, then those stripped titles. Hangar Advanced/Elite pets reuse the standard pet icon when no distinct wiki file exists (`Hangar - Advanced Aeon Timeships` → `Hangar - Aeon Timeships icon.png`). Tray skills use wiki ability filenames: colons are stripped (`Beams: Fire at Will` → `Beams Fire at Will`), then `File:{Name} icon (Federation).png`, with `File:{Name} icon.png` as a fallback for factionless icons. Those titles are matched against [Category:Official images](https://stowiki.net/wiki/Category:Official_images) (Cryptic-provided files tagged by `{{STO official image}}`, ~4,500 files), then any remainder is resolved with MediaWiki `imageinfo`. Files land in:

- `VueUI/public/images/items/`
- `VueUI/public/images/traits/`
- `VueUI/public/images/starship-traits/`
- `VueUI/public/images/ships/`
- `VueUI/public/images/tray-skills/`

`output/OfficialImages.json` and `output/imageIndex.json` record what was found. After the first full download, incremental extracts skip files already in `VueUI/public/images/` and skip titles already recorded as missing on the wiki. Only catalog rows with no local file (new items, or a previous failed download) hit the wiki. After image extract, resolved filenames are stamped onto `Infobox.json` and `TraySkill.json` as `image`. Commit those JSON files and push (production imports on deploy; `npm run import` locally) so the UI can turn that filename into `/images/{kind}/{filename}`, or `{VITE_IMAGE_BASE_URL}/{kind}/{filename}` when the image host is set. Missing wiki files stay as UI placeholders in `VueUI/public/placeholders/`. Use `--force-images` if a previously missing file was later added on the wiki.

Ship renders can be large; files over 8MB are skipped. Item/trait icons are tiny. The local tree is what extract writes. Publish it with `npm run images:sync` ([`docs/image-hosting.md`](../docs/image-hosting.md)). Those binaries are not required for the DB import, and `VueUI/public/images/` is gitignored (only `NOTICE` is tracked). Production serves them from R2 (`https://img.aegisarray.com`).

Game artwork and icons are © Cryptic Studios / Arc Games / DECA / Paramount; sourced from STOWiki; not covered by this repo's licenses; unofficial non-commercial fan site; removed on rights-holder request. See
[`ATTRIBUTION.md`](../ATTRIBUTION.md) and [`VueUI/public/images/NOTICE`](../VueUI/public/images/NOTICE).

## Output in git

`Extractor/output/*.json` **is tracked** so production deploys can import without extracting (including `ShipExperimentalWeapons.json`). Cargo corrections live in `CatalogSupplement`, not in committed supplement files.

`output/importState.json`, `output/last-extract.json`, `output/.wiki-session.json`, and `output/browser-download.js` are **local-only** (gitignored). Production import state lives in the database `ImportState` table.

See the monorepo [README](../README.md) for workspace layout.
