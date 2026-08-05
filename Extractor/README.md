# Extractor

Extracts Star Trek Online game data from [STOWiki](https://stowiki.net) Cargo tables into `output/*.json`, then imports those files into PostgreSQL via `@sto-aegis/database`.

**Workflow**

1. **Extract (manual, local)** — fetch wiki → commit `output/*.json`
2. **Import (automatic / deploy)** — read committed JSON → production DB

Production never hits STOWiki; it only imports JSON shipped in git.

## Setup

From the **monorepo root**:

```bash
npm install
npm run db:generate
npm run db:migrate
```

Use root `.env` for local DB and `.env.production` for Railway.

## Usage

```bash
# from monorepo root

# Manual wiki extract → updates Extractor/output/*.json
npm run extract
npm run extract -- --force-refresh

# Import committed JSON into local DB
npm run import
npm run import -- --force-import

# Import committed JSON into production (Railway)
npm run import:prod
```

Or from this directory:

```bash
npm run extract
npm run import
npm run import:prod
```

## CLI

| Command / flag | Effect |
|----------------|--------|
| `extract` | Fetch Cargo tables into `output/{Table}.json` |
| `import` | Import JSON into PostgreSQL + `linkRelations` |
| `--force-refresh` | Re-extract all tables from STOWiki |
| `--force-import` | Re-import all JSON files (ignore hash skip) |
| `--prod` | Load `.env.production` (used by `import:prod`) |

## Output in git

`Extractor/output/*.json` **is tracked** so production deploys can import without extracting.

`output/importState.json` is **local-only** (gitignored) — hash skip state for local imports.

See the monorepo [README](../README.md) for workspace layout.
