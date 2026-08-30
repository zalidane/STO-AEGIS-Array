# Extractor

Extracts Star Trek Online game data from [STOWiki](https://stowiki.net) Cargo tables into `output/*.json`, then imports those files into PostgreSQL via `@sto-aegis/database`. Image files are downloaded into `VueUI/public/images/`. After Cargo extract, experimental-weapon names are scraped from hull wikitext into `output/ShipExperimentalWeapons.json` (not a Cargo table).

**Workflow**

1. **Extract (manual, local)** — fetch wiki → commit `output/*.json` (and optionally images)
2. **Import (automatic / deploy)** — read committed JSON → production DB

Production never hits STOWiki; it only imports JSON shipped in git. Run extract from a home/residential IP, not Railway.

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

## CLI

| Command / flag | Effect |
|----------------|--------|
| `extract` | Fetch Cargo tables + experimental-weapon sidecar, then catalog images |
| `import` | Import JSON into PostgreSQL + `linkRelations` |
| `--force-refresh` | Re-extract all Cargo tables from STOWiki |
| `--force-images` | Re-query the wiki and re-download image files even if they already exist |
| `--skip-images` | Cargo only |
| `--images-only` | Images only (needs `output/*.json`) |
| `--force-import` | Re-import all JSON files (ignore hash skip) |
| `--prod` | Load `.env.production` (used by `import:prod`) |

## Tests

From the monorepo root:

```bash
npm run test:extractor
```

Node’s test runner covers wiki helpers, ship name lookup, experimental-weapon parsing, and import name dedupe.

## Images

Catalog rows map to wiki files (`File:{Name} icon.png` for items/traits, Cargo `image` for ships). Those titles are matched against [Category:Official images](https://stowiki.net/wiki/Category:Official_images) (Cryptic-provided files tagged by `{{STO official image}}`, ~4,500 files), then any remainder is resolved with MediaWiki `imageinfo`. Files land in:

- `VueUI/public/images/items/`
- `VueUI/public/images/traits/`
- `VueUI/public/images/starship-traits/`
- `VueUI/public/images/ships/`

`output/OfficialImages.json` and `output/imageIndex.json` record what was found. After the first full download, incremental extracts skip files already in `VueUI/public/images/` and skip titles already recorded as missing on the wiki. Only catalog rows with no local file (new items, or a previous failed download) hit the wiki. After image extract, resolved filenames are stamped onto `Infobox.json` as `image`. Re-import (`npm run import`) so GraphQL/UI can look up `/images/items/{filename}`. Missing wiki files stay as UI placeholders. Use `--force-images` if a previously missing file was later added on the wiki.

Ship renders can be large; files over 8MB are skipped. Item/trait icons are tiny. Commit whichever images you want in git — binaries are not required for the DB import.

Third-party licensing for extracted text and images is documented in
[`ATTRIBUTION.md`](../ATTRIBUTION.md) and [`VueUI/public/images/NOTICE`](../VueUI/public/images/NOTICE).

## Output in git

`Extractor/output/*.json` **is tracked** so production deploys can import without extracting (including `ShipExperimentalWeapons.json`).

`output/importState.json` and `output/.wiki-session.json` are **local-only** (gitignored).

See the monorepo [README](../README.md) for workspace layout.
