# STO Extractor (TypeScript)

Extracts Star Trek Online game data from [STOWiki](https://stowiki.net) Cargo tables, caches it as JSON, and imports it into PostgreSQL via Prisma — including resolved relationships between ships, traits, items, and more.

## Requirements

- Node.js 20+
- PostgreSQL
- Network access to `stowiki.net` (for fresh extracts; local `output/*.json` can be used if the wiki is unreachable)

## Setup

```bash
npm install
```

Create a `.env` file in the project root:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE"
```

Apply migrations and generate the Prisma client:

```bash
npx prisma migrate deploy
npx prisma generate
```

## Usage

Run the full pipeline (extract stale tables → import → link relations):

```bash
npm run dev
```

### CLI flags

| Flag | Effect |
|------|--------|
| `--force-refresh` | Re-extract all Cargo tables from STOWiki, ignoring the local cache TTL |
| `--force-import` | Re-import all JSON files into the DB, ignoring content-hash skip logic |

Examples:

```bash
npm run dev -- --force-import
npm run dev -- --force-refresh --force-import
```

### Build

```bash
npm run build
```

## Pipeline overview

```text
STOWiki Cargo API
       │
       ▼
  extract (cached)  →  output/{Table}.json
       │
       ▼
  map + import       →  PostgreSQL (Prisma)
       │
       ▼
  linkRelations      →  FKs / join tables
```

1. **Extract** — Fetches Cargo field lists and paginated rows from the wiki API; writes `output/*.json`. Skips tables whose cache is still fresh unless `--force-refresh` is set. If the wiki is blocked/unreachable, keeps existing local JSON.
2. **Import** — Validates JSON, maps rows with cargo mappers, upserts or replaces Prisma models. Skips unchanged files (hash in `output/importState.json`) unless `--force-import` is set.
3. **Link** — After any successful import (or forced import), resolves cross-table relationships.

## Cargo tables

| Wiki table | Prisma model | Import strategy |
|------------|--------------|-----------------|
| Infobox | `Infobox` | Replace |
| Ships | `Ship` | Upsert by `name` |
| StarshipTraits | `StarshipTrait` | Upsert by `name` |
| Mastery | `Mastery` | Replace |
| Modifiers | `Modifier` | Upsert by `modifier` + `type` |
| GwObtain | `GwObtain` | Upsert by `cat` + `type` + `flavor` |
| SwObtain | `SwObtain` | Upsert by `cat` + `type` + `flavor` |
| Reputation | `Reputation` | Upsert by `name` |
| SetBonus | `SetBonus` | Upsert by `name` |
| Traits | `Trait` | Upsert by `name` + `type` + `environment` |
| TraySkill | `TraySkill` | Upsert by `name` |

Import order prefers dependencies first (e.g. Infobox and Ships before Mastery / obtain tables).

## Relationships

After import, `linkRelations` populates:

| Relationship | Mechanism |
|--------------|-----------|
| StarshipTrait ↔ Ship | Join `StarshipTraitShip` (wiki links in `obtained`) |
| Mastery → StarshipTrait | `traitId` / `trait2Id` / `trait3Id` / `acctraitId` |
| Ship / Mastery → type | Shared `ShipType` (`shipTypeId`) |
| GwObtain / SwObtain → Infobox | `lockBoxId` (`{lb} Lock Box`) |
| Modifier ↔ Infobox | Join `ModifierItem` (comma-separated `available`) |
| Ship → Infobox | `uniconsoleId` (exact console title) |

Raw cargo strings are kept on the models; FKs and join rows are derived.

## Project structure

```text
src/
  main.ts                 # CLI entry
  cargoClient.ts          # Wiki Cargo API client
  extractors/             # Extract + cache
  importers/              # Import, hash state, relation linking
  mappers/                # Raw cargo → Prisma-shaped rows
  types/CargoTypes.ts     # Raw JSON row types
  utils/                  # JSON validation, wiki/list parsing
prisma/
  schema.prisma
  migrations/
output/                   # Cached JSON + importState.json
```

## Notes

- Wiki requests use browser-like headers to reduce bot blocking; Cloudflare may still block extracts — local `output/` files are used as fallback.
- `@prisma/adapter-pg` can issue concurrent queries inside a transaction; the importer serializes `PoolClient.query` to avoid the `pg` deprecation warning (hard error in `pg@9`).
- Trait `environment` nulls are normalized to `""` so compound unique upserts work with Prisma/PostgreSQL.

## License

MIT
