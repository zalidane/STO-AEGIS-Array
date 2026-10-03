# Extractor

Extracts Star Trek Online game data from [STOWiki](https://stowiki.net) Cargo tables into `output/*.json`, then imports those files into PostgreSQL via `@sto-aegis/database`. Image files are downloaded into `VueUI/public/images/`. After Cargo extract, experimental-weapon names are scraped from hull wikitext into `output/ShipExperimentalWeapons.json` (not a Cargo table).

Cargo gaps are filled at import, and Cargo stays the source of the committed JSON. **CatalogSupplement** (a database table) holds corrections that must survive without a repository update: modifier tokens, missing reputation factions, set-bonus membership, and personal-trait `career`. Import merges those rows with the Cargo file before writing Prisma models. Cargo remains primary: supplements insert missing rows and may widen `type` / `available` / `Members` or fill empty reputation fields and empty `career`, but do not overwrite non-empty wiki `stats`, `Passives`, or reputation descriptions.

**Workflow**

1. **Extract (manual or monthly home check, local)** — fetch wiki → commit `output/*.json` (and optionally images)
2. **Import (automatic / deploy)** — read committed JSON, merge `CatalogSupplement` rows → production DB

Production never hits STOWiki; it only imports JSON shipped in git. Run extract from a home/residential IP, not Railway.

## Incremental behavior (what actually skips the wiki)

| Stage | Incremental? | Behavior |
|-------|--------------|----------|
| **Cargo tables** | Age-gated full refresh | If `output/{Table}.json` is newer than **24 hours**, that table is skipped. When stale (or `--force-refresh`), extract re-fetches the **entire** table — not row-level deltas. |
| **ShipExperimentalWeapons** | Yes (new hulls) | Only experimental ships missing from the sidecar JSON are scraped. Delete the sidecar to rebuild. `--force-refresh` does **not** re-scrape existing hulls. |
| **Images** | Yes (files) | Skips files already under `VueUI/public/images/`; skips titles already recorded missing/skipped in `imageIndex.json`. Only new or previously failed titles hit the wiki. `--force-images` re-queries and re-downloads. |
| **Official images category** | Cached list | Incremental image runs reuse `OfficialImages.json`; `--force-images` re-lists the category. |
| **Import / `linkRelations`** | N/A (no wiki) | Runs against committed JSON, then merges `CatalogSupplement`. Local `importState.json` (gitignored) hash-skips unchanged tables unless `--force-import`. A `CatalogSupplement` edit changes that hash, so the next import applies it without a new commit. |

There was no gap to “fix” for images — they were already file-level incremental. Cargo cannot be row-level incremental via the public Cargo API without fetching tables; the 24h gate plus the monthly home check is the intended skip policy.

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

After a real run, review the diff, commit updated `Extractor/output/*.json` (and any new images you want tracked), push, then `npm run import:prod` (or rely on GraphQL `releaseCommand` after push).

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

Use root `.env` for local DB + wiki credentials and `.env.production` for Railway.

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
npm run extract -- --images-only --force-images

# Cargo only
npm run extract -- --skip-images

# Import committed JSON into local DB
npm run import
npm run import -- --force-import

# Import committed JSON into production (Railway)
npm run import:prod
```

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
| `--force-import` | Re-import all JSON files (ignore hash skip) |
| `--prod` | Load `.env.production` (used by `import:prod`) |
| `--force` / `--check-only` | With `extract:home` only: always run / print decision without extracting |

## Tests

From the monorepo root:

```bash
npm run test:extractor
```

Node’s test runner covers wiki helpers, ship name lookup, experimental-weapon parsing, modifier / reputation / set-bonus / traits supplement merge, the `CatalogSupplement` loader, import name dedupe, and the monthly home-extract schedule gate.

## Images

Catalog rows map to wiki files (`File:{Name} icon.png` for items/traits, Cargo `image` for ships). Item Cargo names often include `Mk XII` and `[Acc]`/`[Dmg]x2` suffixes that the wiki file does not; extract tries the full name first, then those stripped titles. Hangar Advanced/Elite pets reuse the standard pet icon when no distinct wiki file exists (`Hangar - Advanced Aeon Timeships` → `Hangar - Aeon Timeships icon.png`). Tray skills use wiki ability filenames: colons are stripped (`Beams: Fire at Will` → `Beams Fire at Will`), then `File:{Name} icon (Federation).png`, with `File:{Name} icon.png` as a fallback for factionless icons. Those titles are matched against [Category:Official images](https://stowiki.net/wiki/Category:Official_images) (Cryptic-provided files tagged by `{{STO official image}}`, ~4,500 files), then any remainder is resolved with MediaWiki `imageinfo`. Files land in:

- `VueUI/public/images/items/`
- `VueUI/public/images/traits/`
- `VueUI/public/images/starship-traits/`
- `VueUI/public/images/ships/`
- `VueUI/public/images/tray-skills/`

`output/OfficialImages.json` and `output/imageIndex.json` record what was found. After the first full download, incremental extracts skip files already in `VueUI/public/images/` and skip titles already recorded as missing on the wiki. Only catalog rows with no local file (new items, or a previous failed download) hit the wiki. After image extract, resolved filenames are stamped onto `Infobox.json` and `TraySkill.json` as `image`. Re-import (`npm run import`) so GraphQL/UI can look up `/images/items/{filename}` or `/images/tray-skills/{filename}`. Missing wiki files stay as UI placeholders. Use `--force-images` if a previously missing file was later added on the wiki.

Ship renders can be large; files over 8MB are skipped. Item/trait icons are tiny. Commit whichever images you want in git — binaries are not required for the DB import.

Third-party licensing for extracted text and images is documented in
[`ATTRIBUTION.md`](../ATTRIBUTION.md) and [`VueUI/public/images/NOTICE`](../VueUI/public/images/NOTICE).

## Output in git

`Extractor/output/*.json` **is tracked** so production deploys can import without extracting (including `ShipExperimentalWeapons.json`). Cargo corrections live in `CatalogSupplement`, not in committed supplement files.

`output/importState.json`, `output/last-extract.json`, and `output/.wiki-session.json` are **local-only** (gitignored).

See the monorepo [README](../README.md) for workspace layout.
